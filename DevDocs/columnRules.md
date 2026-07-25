# Column change rules

How row data is handled when a table's columns are edited in the schema editor.
These rules are current and apply to the datatypes the editor offers today:
`TEXT`, `REAL`, `INTEGER`, `BOOLEAN`, `DATE`, `TIME`, `DATETIME`, and foreign keys.

Two storage notes that the rest of this document depends on:

- `DATE`, `TIME`, and `DATETIME` are stored as `TEXT`. Wherever a rule below says
  **text type**, it means `TEXT`, `DATE`, `TIME`, and `DATETIME` alike. They are
  treated identically for every purpose here.
- `BOOLEAN` is stored as `0` or `1`.

## When using `preserveData = false`

All rows are deleted. The rebuilt table is empty, and none of the rules below apply.

Everything that follows describes `preserveData = true`.

## Datatype changes

| From → To | Result |
|---|---|
| text → text | Value unchanged |
| text → `INTEGER` | `Number(String(v).trim())`; `NaN` becomes `0`; then truncated toward zero |
| text → `REAL` | `Number(String(v).trim())`; `NaN` becomes `0` |
| text → `BOOLEAN` | `1` if the trimmed value case-insensitively equals `true`, otherwise `0` |
| `INTEGER` / `REAL` → text | `String(v)` |
| `INTEGER` → `REAL` | Unchanged |
| `REAL` → `INTEGER` | Truncated toward zero |
| `INTEGER` / `REAL` → `BOOLEAN` | `0` stays `0`; any other value becomes `1` |
| `BOOLEAN` → text | `'true'` or `'false'` |
| `BOOLEAN` → `INTEGER` / `REAL` | Unchanged (`0` or `1`) |
| any → foreign key | `NULL` |
| foreign key → text | `''` |
| foreign key → `INTEGER` / `REAL` / `BOOLEAN` | `0` |
| foreign key → foreign key, different referenced table | `NULL` |

A `NULL` value stays `NULL` through every conversion above. Only the required-column
rule below ever replaces a `NULL`.

## Name changes

The value moves to the new column name, unchanged. If a column is renamed and altered
in other ways in the same save, all of those changes apply to that one column.

## Column additions

New columns are filled in for every existing row:

| Datatype | Value |
|---|---|
| text type | `''` |
| `INTEGER` / `REAL` | `0` |
| `BOOLEAN` | `0` |
| foreign key | `NULL` |

If a new column is also unique or required, the rules below apply to it as well.

## Column deletions

The column and all of its values are removed. Every other column keeps its values.

## Constraint changes

Constraints are `primary`, `unique`, or `none`.

No data changes are needed for `unique` → `none`, `primary` → `none`,
`primary` → `unique`, or `unique` → `primary`. The schema editor guarantees only one
column is primary.

For `none` → `unique` and `none` → `primary`, existing values have to be made unique.
In all cases the first occurrence of a value is kept and only later duplicates are
repaired:

- **Text types**: walking rows in order, each duplicate occurrence gets `_1`, `_2`,
  `_3`… appended, counting from the first duplicate. So three rows reading `Lucy`
  become `Lucy`, `Lucy_1`, `Lucy_2`. A generated value must not collide with any other
  final value in the column, including values that were left untouched; if it would,
  keep incrementing until it doesn't.
- **`INTEGER` and `REAL`**: each duplicate after the first is reassigned to the
  smallest positive integer that is not present anywhere else in the column and has
  not already been assigned during this step.
- **Foreign keys**: each duplicate after the first is set to `NULL`. The user is
  warned that these are not automatically adjusted to point at anything meaningful.
  (This could be handled by pulling all primary keys from the referenced table and
  assigning as many as possible, but that seems like a lot of effort for a feature few
  would use.)
- **`BOOLEAN`**: not possible to satisfy for more than two rows. The request is
  rejected; see "When a change can't be applied".

A column whose constraint is `primary` is treated as required, whatever its
`isRequired` value says.

## isRequired changes

Changing `isRequired` from true to false requires no data changes.

For false to true, every `NULL` (and every `''` in a text column) is replaced:

| Datatype | Value | If the column is also unique |
|---|---|---|
| text type | `'default'` | `'default_1'`, `'default_2'`… skipping any value already present in the column |
| `INTEGER` / `REAL` | `1` | The smallest unused positive integers, ascending |
| `BOOLEAN` | `0` | n/a. See the constraint rules |
| foreign key | The lowest value present in the referenced column | Distinct values from the referenced column, ascending |

If a required foreign key column has no usable value available in the referenced
column, the request is rejected.

## Order of operations

Each step sees the results of the ones before it:

1. Column deletions
2. Column renames
3. Datatype conversions
4. Column additions
5. Foreign key validation: any value not present in the referenced column becomes `NULL`
6. Constraint changes (making values unique)
7. Required-column changes (filling in blanks)

Once all of it has been applied, the saved table must satisfy all of the following:

- No `NULL` in any required or primary column
- No duplicates in any unique or primary column
- Every foreign key value is either `NULL` or present in its referenced column
- The row count is unchanged from before the request

## When a change can't be applied

Some requests can't satisfy the rules above: a `BOOLEAN` column made unique, or a
required foreign key with nothing valid to point at. These are rejected, and the
existing table and all of its rows are left exactly as they were. A save either
applies completely or not at all; a partly-migrated table is never left behind, and
neither is any temporary table used along the way.
