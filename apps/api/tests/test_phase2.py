import zipfile
from pathlib import Path

import pytest
from openpyxl import Workbook

from app.services.parsers import detect_parser, is_tabular_file, parse_docx, sanitize_identifier
from app.services.sqlguard import (
    SQLValidationError,
    validate_sql,
    virtual_schema_ddl,
    wrap_with_limit,
)
from app.services.tabular import infer_sql_type, parse_spreadsheet


def test_sanitize_identifier():
    assert sanitize_identifier("Line No.") == "line_no"
    assert sanitize_identifier("Output Qty (pcs)") == "output_qty_pcs"
    assert sanitize_identifier("  ") == "column"
    assert sanitize_identifier("দিন") == "দিন"


def test_is_tabular_file():
    assert is_tabular_file("production.xlsx")
    assert is_tabular_file("sheet.CSV")
    assert not is_tabular_file("sop.pdf")


def test_infer_sql_type():
    assert infer_sql_type([1, 2, 3]) == "bigint"
    assert infer_sql_type([1.5, "2,5".replace(",", ".")]) == "numeric"
    assert infer_sql_type(["2024-08-19", "2024-08-20"]) == "date"
    assert infer_sql_type(["Sewing", "Finishing"]) == "text"
    assert infer_sql_type([]) == "text"
    assert infer_sql_type(["12", "13"]) == "numeric"


def test_parse_xlsx_with_types(tmp_path: Path):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Daily Report"
    sheet.append(["Line", "Output Qty", "Date"])
    sheet.append(["L07", 1200, "2024-08-19"])
    sheet.append(["L03", "1,400", "2024-08-20"])
    path = tmp_path / "report.xlsx"
    workbook.save(path)

    sheets = parse_spreadsheet(path)
    assert len(sheets) == 1
    data = sheets[0]
    assert data["name"] == "Daily Report"
    assert data["columns"] == ["line", "output_qty", "date"]
    assert data["rows"][0] == {"line": "L07", "output_qty": 1200, "date": "2024-08-19"}
    assert data["rows"][1]["output_qty"] == 1400


def test_parse_csv(tmp_path: Path):
    path = tmp_path / "qc.csv"
    path.write_text("defect,count\nstitch broken,12\noil spot,7\n", encoding="utf-8")
    sheets = parse_spreadsheet(path)
    assert sheets[0]["columns"] == ["defect", "count"]
    assert sheets[0]["rows"][0] == {"defect": "stitch broken", "count": 12}


def test_parse_docx(tmp_path: Path):
    content = (
        '<?xml version="1.0"?><w:document '
        'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body><w:p><w:r><w:t>Fire safety SOP section one.</w:t></w:r></w:p>"
        "<w:p><w:r><w:t>Exits must remain clear.</w:t></w:r></w:p></w:body></w:document>"
    )
    path = tmp_path / "sop.docx"
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("word/document.xml", content)
    parsed = parse_docx(path)
    assert len(parsed.pages) == 1
    assert "Fire safety SOP section one." in parsed.pages[0]
    assert "Exits must remain clear." in parsed.pages[0]


def test_detect_parser_dispatch(tmp_path: Path):
    assert callable(detect_parser(".pdf"))
    assert callable(detect_parser(".docx"))
    assert callable(detect_parser(".png"))
    assert detect_parser(".weird") is None


def test_validate_sql_accepts_select():
    assert validate_sql("SELECT line, COUNT(*) FROM t GROUP BY line;") == (
        "SELECT line, COUNT(*) FROM t GROUP BY line"
    )


def test_validate_sql_accepts_cte():
    cleaned = validate_sql("WITH x AS (SELECT 1 AS a) SELECT a FROM x")
    assert cleaned.upper().startswith("WITH")


@pytest.mark.parametrize(
    "sql",
    [
        "DROP TABLE t",
        "DELETE FROM t",
        "INSERT INTO t VALUES (1)",
        "UPDATE t SET a=1",
        "SELECT 1; DROP TABLE t",
        "SELECT 1 -- hidden comment",
        "",
        "   ",
        "TRUNCATE t",
        "SELECT pg_sleep(10)",
        "CREATE TABLE x(a int)",
    ],
)
def test_validate_sql_rejects_dangerous(sql):
    with pytest.raises(SQLValidationError):
        validate_sql(sql)


def test_wrap_with_limit():
    wrapped = wrap_with_limit("SELECT * FROM t", limit=50)
    assert wrapped.startswith("SELECT * FROM (SELECT * FROM t) AS mios_bounded LIMIT 50")
    default_wrapped = wrap_with_limit("SELECT 1 AS a")
    assert default_wrapped.endswith("LIMIT 1000")


def test_virtual_schema_ddl():
    ddl = virtual_schema_ddl([{"name": "line", "type": "text"}, {"name": "qty", "type": "bigint"}])
    assert ddl == "CREATE TABLE t (line text, qty bigint);"
