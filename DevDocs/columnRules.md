Here's what I have in mind:
##  When using `preserveData = false`
- All rows are deleted. 

## Datatype changes, when `preserveData = true`
- If a column's datatype is changed from number -> string, all values are turned to strings with .toString()
- If a column's datatype is changed from string -> number, all values are turned to numbers using `Number(value.trim())`.  If that results in `NaN`, the value is set to 0. 
- If a columns datatype changed from "foreign key" to string, all values are set to blank. If changed from "foreign key" to a number, all values are set to 0. 

## Name changes, when `preserveData = true`
- Row data is stored as JSON objects, so when a column name changes, each row's data is edited to delete the old column name, and it's value is copied to a JSON key with the new column name.

## Column additions, when `preserveData = true`
- New columns of datatype string, number, or foreign key  are added to all rows with an empty string, 0, or null, respectively. 

## Column deletions, when `preserveData = true`
- If a column is deleted, all rows have that column name & value deleted from their data.

## Constraint changes, when `preserveData = true`
- Constraints can either be "primary", "unique", or "none". For primary -> none or unique -> none, no row changes are needed. 
- For primary -> unique and unique -> primary, no data changes are needed as well. The frontend ensures only one column is primary. 
- For "none" -> "unique" or "none" -> "primary", all values must be unique. For strings, the # of occurences of each unique string are counted. Then, each string gets an underscore and a number appended on it's end. So if there are 3 rows with the value "Lucy", they become "Lucy_1", "Lucy_2", "Lucy_3". 
- For numbers that must be unique, all numbers are reset. They are then assigned ascending values, starting from 1. 
- For foreign keys that must be unique, duplicates are set to null.  The user is warned that these are not automatically adjusted to be unique. (This could be handled by pulling all primary keys from the referenced table and assigning as many to be unique as possible, but this seems like a lot of effort for a feature few would use)

## isRequired changes, when `preserveData = true`
- Changing isRequired from true -> false requires no data changes.
- For changing row from isRequired from false -> true, if the datatype is string, all blank values can be set to "default" (or "default_1", "default_2", if they must be unique.)
- All numbers can be set to 1 (or 1, 2, 3, if they need to be unique)
-  All foreign keys can be set to the first reference value available. If foreign keys must be unique, the user is warned that they are not automatically adjusted. 