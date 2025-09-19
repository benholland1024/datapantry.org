TOMORROW:

 - [x] Fix /api/database/[databaseId].post.ts.  

///

 - [ ] Once that's figured out, get /api/table/[tableId].put.ts to
save column changes & retain rows. 

Then, get it to do the crazy row updates you want it to do. 

///

Then, get it so deleting tables works correctly.
(Get impact, show the modal, delete on confirm)

///  

Finally, implement other validation on the schema editor:
 - one and only one primary key per table
 - primary key must be required
 - no duplicate names of tables per database
 - no duplicate names of columns per table
 - no empty table names
 - no empty column names