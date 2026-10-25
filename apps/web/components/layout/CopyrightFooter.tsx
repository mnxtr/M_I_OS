/** Shared, unobtrusive author credit for public and authenticated Linora shells. */
export function CopyrightFooter() {
  return (
    <footer className="border-t border-line px-5 py-4 text-center text-xs text-muted sm:px-8">
      <small>Copyright © {new Date().getFullYear()} Mansib Newaz. All rights reserved.</small>
    </footer>
  );
}
