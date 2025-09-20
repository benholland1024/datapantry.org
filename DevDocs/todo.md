TOMORROW:

 - [x] Fix /api/database/[databaseId].post.ts.  

///

 - [x] Once that's figured out, get /api/table/[tableId].put.ts to
       save column changes & retain rows. 

 - [x] Then, get it to do the crazy row updates you want it to do. 

///

 - [x] Then, get it so deleting tables works correctly.
       (Get impact, show the modal, delete on confirm)

///  

 - [ ] Finally, implement other validation on the schema editor:
        - one and only one primary key per table
        - primary key must be required
        - no duplicate names of tables per database
        - no duplicate names of columns per table
        - no empty table names
        - no empty column names

## ROW EDITOR:
 
 - [ ] Change the structure of tableRows, starting from loadTableData.
       This means probably editing GET /api/table/${tableId} too. 
       Each row should look like this: { id: string, data: {} }