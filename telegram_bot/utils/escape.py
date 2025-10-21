import re


def escape_md_v2(text: str | None) -> str | None:
    """ Escape str for telegram (MarkdownV2) """
    return re.sub(r'([_*\[\]()~`>#+\-=|{}.!])', r'\\\1', text) if isinstance(text, str) else None
