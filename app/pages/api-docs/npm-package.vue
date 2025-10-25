<template>
  <ColumnPageWrapper>
    <!--------------------------------------------->
    <!--  How to Use the Datapantry NPM Package  -->
    <!--------------------------------------------->
    <LinkableHeader tagName="h1" linkName="how-to-use-the-npm-package">
      &#x1F96B; How to Use the Datapantry NPM Package
    </LinkableHeader>
    <p>The NPM package is perfect if you're using NodeJS for your server.</p>

    <h3>1. Install the package</h3>
    <p>To get started, run this:</p>
    <CodeRender :code="`npm install datapantry`" language="bash" 
      class="mb-4" filename="bash"
    />
    <h3>2. Import, add your key, and use your data!</h3>
    <p>Here's an example of how it might be used in a Node.js application:</p>
    <CodeRender :code="exampleNPMusage.trim()" language="javascript" 
      class="mb-4" filename="server.js"
    />
    <p class="!mb-8">&#x1F603;</p>
    <p>Here are a few more examples, followed by the full documentation of all methods:</p>
    <CodeRender :code="exampleNPMusage2.trim()" language="javascript" 
      class="mb-4" filename="server.js"
    />
    <br/><br/><br/><br/>
    <h2>Full NPM Package Method Documentation</h2>
    <p>The methods below can be chained onto your DataPantry database (except the "helper" methods).</p>
    <div v-for="category in methodListByCategory"
      :key="category.name" 
      class="mt-8 mb-4 px-4 py-4 bg-content border rounded-lg"
      :style="{ borderColor: category.borderColor }"
    >
      <h3 class="text-lg text-center"> &#10070; <b>{{ category.name }}</b> &#10070;</h3>
      <p class="text-center mb-4" v-if="category.description">{{ category.description }}</p>
      <div v-for="method in category.methods"
        :key="method.name"
        class="my-[32px]"
      >
        <LinkableHeader 
          tagName="h3" 
          :linkName="method.name"
          class="text-md"
          :html="highlightMethodName(method.name, category.textColor)"
        />
        <p class="mb-2" v-for="(argument, index) in method.arguments" :key="index">
          <b>Argument {{ index + 1 }}:</b> {{ argument }}
        </p>
        <p>Example:</p>
        <CodeRender 
          :code="generateExample(method)" 
          language="javascript" 
          class="mb-4" 
          :filename="method.name + '-example.js'"
        />
      </div>
    </div>
  </ColumnPageWrapper>
</template>

<script setup lang="ts">

import ColumnPageWrapper from '~/components/atoms/ColumnPageWrapper.vue';
import CodeRender from '~/components/atoms/CodeRender.vue';
import LinkableHeader from '~/components/atoms/LinkableHeader.vue';
import { ref } from 'vue';

type MethodItem = { name: string; arguments: string[]; description?: string, examples?: string[] };
type MethodCategory = {
  name: string;
  description?: string;
  borderColor: string;
  textColor: string;
  methods: MethodItem[]
};
type MethodMap = MethodCategory[];

const exampleNPMusage = ref(`

import DataPantry from 'datapantry';

const db = DataPantry.database('YOUR_API_KEY');

async function test() {
  const schema = await db.schema()  //  { DBname: String, tables: [] }

  //  Use these "chainable" query builders:
  const bluePaperclips = await db.select('*')
    .from('PaperclipCollection')
    .where({ color: 'blue' })

  //  Or if you'd prefer, use raw SQL:
  const redPaperclips = await db.sql(
    'SELECT * FROM PaperclipCollection WHERE color = ?', 'red'
  )
  console.log("Schema:", schema, "Blue Paperclips:", bluePaperclips, "Red Paperclips:", redPaperclips);
}
test()

`)

const exampleNPMusage2 = ref(`
// SELECT with conditions
const users = await db.select('*').from('users')
  .where(gt('age', 18))
  .where(eq('country', 'DE'))
  .orderBy('name', 'ASC')
  .limit(10)

// INSERT
await db.insert('users')
  .values({ name: 'Alice', email: 'alice@example.com' })

// UPDATE
await db.update('users')
  .set({ status: 'active' })
  .where(eq('id', 123))

// DELETE
await db.delete().from('users')
  .where(lt('lastLogin', '2024-01-01'))
`);

const methodListByCategory = ref<MethodMap>([
  { 
    name: 'SELECT',
    borderColor: '#4CA378',
    textColor: '#6CE398',
    methods: [
      { 
        name: '.`select`(...columns)',
        arguments: ['Specify columns or "*"'],
        examples: ['await db.select("name", "age")', 'await db.select("*")']
      },
      { 
        name: '.`from`(tableName)',
        arguments: ['Table name'],
        examples: ['await db.select("*").from("users")']
      },
      { 
        name: '.`where`(condition)',
        arguments: ['Filtering conditions (see helper functions below)'],
        description: 'Add filtering conditions to your SELECT query. You can chain multiple where() calls to combine conditions with AND logic.',
        examples: ['await db.select("*").from("users").where(eq("age", 18))', 'await db.select("*").from("users").where(eq("age", 18)).where(eq("country", "DE"))']
      },
      { 
        name: '.`orWhere`(condition)',
        arguments: ['Filtering conditions (see helper functions below)'],
        description: 'Add OR conditions to your SELECT query. This can be used in combination with where().',
        examples: ['await db.select("*").from("users").where(eq("age", 18)).orWhere(eq("country", "DE"))']
      },
      { 
        name: '.`orderBy`(columnName, direction?)',
        arguments: ["A column name.", "'ASC' or 'DESC' (default 'ASC')"],
        description: 'Specify the sort order for the results.',
        examples: ['await db.select("*").from("users").orderBy("name", "ASC")']
      },
      { 
        name: '.`limit`(n)',
        arguments: ['An integer number'],
        description: 'Limit the number of results returned.',
        examples: ['await db.select("*").from("users").limit(10)']
      },
      { 
        name: '.`offset`(n)',
        arguments: ['An integer number'],
        description: 'Skip the first n results. Useful for pagination.',
        examples: ['await db.select("*").from("users").offset(20)']
      },
      { 
        name: '.`join`(tableName, conditionString)',
        arguments: [`A table name.`, `A condition string (e.g. "users.id = orders.userId"). 
                    CAUTION: Do not use user-provided input directly in the condition string to avoid SQL injection vulnerabilities.`],
        description: 'Inner join another table on a condition. This will only return rows that have matching values in both tables.',
        examples: ['await db.select("*").from("users").join("orders", eq("users.id", "orders.userId"))']
      },
      { 
        name: '.`leftJoin`(tableName, conditionString)',
        arguments: [`A table name.`, `A condition string (e.g. "users.id = orders.userId"). 
                    CAUTION: Do not use user-provided input directly in the condition string to avoid SQL injection vulnerabilities.`],
        description: 'Left join another table on a condition. This will return all rows from the left table, and the matched rows from the right table. If there is no match, the result is NULL on the right side.',
        examples: ['await db.select("*").from("users").leftJoin("orders", eq("users.id", "orders.userId"))']
      },
    ],
  }, {
    name: 'INSERT',
    borderColor: '#F8DC94',
    textColor: '#F8DC94',
    description: 'Insert new rows into a table. Expect this response back: { changes: 1, lastInsertRowid: 5 }',
    methods: [
      {
        name: '.`insert`(tableName).values(data)',
        arguments: ['A table name.', 'A single object or array of objects'],
        examples: ['insert("users").values({ name: "Alice", email: "alice@example.com" })']
      },
      // { name: 'insert(table).values([...]).returning("*")', arguments: 'Return inserted rows (if supported)' },
    ],
  }, {
    name: 'UPDATE',
    borderColor: '#E8A05C',
    textColor: '#E8A05C',
    methods: [
      {
        name: '.`update`(tableName).set(data).where(condition)',
        arguments: ['A table name.', 'An object with the columns to update.'],
        examples: ['update("users").set({ age: 30 }).where(eq("id", 123))']
      },
    ],
  }, {
    name: 'DELETE',
    borderColor: '#D45978',
    textColor: '#D45978',
    methods: [
      {
        name: '.`delete`().from(tableName).where(condition)',
        arguments: ['A table name.', 'A condition (see helper functions below)'],
        examples: ['delete().from("users").where(eq("id", 123))']
      },
    ],
  }, {
    name: 'Execution',
    borderColor: '#A15FAE',
    textColor: '#A15FAE',
    methods: [
      {
        name: '.`first`()',
        arguments: ['Return first result only'],
        examples: ['await db.select("*").from("users").first()']
      },
      {
        name: '.`count`()',
        arguments: ['Return count instead of rows'],
        examples: ['await db.select("*").from("users").count()']
      },
    ],
  }, {
    name: 'Helper functions for conditions',
    borderColor: '#4B5799',
    textColor: '#8B97E9',
    methods: [
      {
        name: '`eq`(column, value)',
        arguments: ['Equals'],
        examples: ['where(eq("age", 18))']
      },
      {
        name: '`ne`(column, value)',
        arguments: ['Not equals'],
        examples: ['where(ne("age", 18))']
      },
      {
        name: '`gt`(column, value)',
        arguments: ['Greater than'],
        examples: ['where(gt("age", 18))']
      },
      {
        name: '`gte`(column, value)',
        arguments: ['Greater/equal'],
        examples: ['where(gte("age", 18))']
      },
      {
        name: '`lt`(column, value)',
        arguments: ['Less than'],
        examples: ['where(lt("age", 18))']
      },
      {
        name: '`lte`(column, value)',
        arguments: ['Less/equal'],
        examples: ['where(lte("age", 18))']
      },
      {
        name: '`like`(column, pattern)',
        arguments: ['LIKE operator'],
        examples: ['where(like("name", "%Alice%"))']
      },
      {
        name: '`inArray`(column, values)',
        arguments: ['inArray operator'],
        examples: ['where(inArray("id", [1, 2, 3]))']
      },
    ],
  }
]);

function generateExample(method: MethodItem): string {
  if (method.examples && method.examples.length > 0) {
    return method.examples.join('\n\n');
  }
  return `// Example for ${method.name} not provided.`;
}

function highlightMethodName(methodName: string, color: string): string {
  let finalName = methodName.replace('`', `<span style="color: ${color}">`).replace('`', '</span>');
  return finalName;
}
</script>