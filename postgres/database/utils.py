from typing import Union

from sqlalchemy.dialects import postgresql
# noinspection PyProtectedMember
from sqlalchemy.sql.base import _NoArg


class EnumByValues(postgresql.ENUM):
    def __init__(self, *enums, name: Union[str, _NoArg, None] = _NoArg.NO_ARG, create_type: bool = True, **kw):
        kw.setdefault('values_callable', lambda obj: [e.value for e in obj])
        super().__init__(*enums, name=name, create_type=create_type, **kw)