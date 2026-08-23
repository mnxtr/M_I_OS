from app.services.query_understanding import detect_language, expand_query


def test_detect_bangla_script():
    assert detect_language("লাইন ৭ এর আউটপুট কত?") == "bn"


def test_detect_transliterated_banglish():
    assert detect_language("line 7 er output koto chilo") == "bn-latin"
    assert detect_language("kormi der beton koto") == "bn-latin"


def test_detect_english():
    assert detect_language("What was the SMETA audit finding last month?") == "en"
    assert detect_language("show me line 7 efficiency") == "en"


def test_expand_english_single_variant():
    analysis = expand_query("Show fire drill records")
    assert analysis.language == "en"
    assert analysis.variants == ["Show fire drill records"]


def test_expand_banglish_adds_normalized_variant():
    analysis = expand_query("line 7 er output koto chilo last week")
    assert analysis.language == "bn-latin"
    assert len(analysis.variants) == 2
    original, normalized = analysis.variants
    assert original.startswith("line 7")
    assert "production" in normalized or "how much" in normalized


def test_expand_bangla_script_keeps_original():
    question = "লাইন ৭ এর আউটপুট কত?"
    analysis = expand_query(question)
    assert analysis.language == "bn"
    assert analysis.variants[0] == question


def test_expand_dedupes_variants():
    analysis = expand_query("quality kemon")
    lowered = [v.lower() for v in analysis.variants]
    assert len(lowered) == len(set(lowered))


def test_expand_handles_empty_and_whitespace():
    assert expand_query("").variants == []
    assert expand_query("   ").variants == []
