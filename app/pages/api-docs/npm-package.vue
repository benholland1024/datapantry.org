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
  </ColumnPageWrapper>
</template>

<script setup lang="ts">

import ColumnPageWrapper from '~/components/atoms/ColumnPageWrapper.vue';
import CodeRender from '~/components/atoms/CodeRender.vue';
import LinkableHeader from '~/components/atoms/LinkableHeader.vue';
import { ref } from 'vue';

const exampleNPMusage = ref(`

import { Datapantry } from 'datapantry';

const dp = new Datapantry({
  apiKey: 'YOUR_API_KEY',
});

async function test() {
  const schema = await myDatabase.schema()  //  { DBname: String, tables: [] }
  const DEcustomers = await myDatabase.sql(
    'SELECT * FROM Customers WHERE country = ?', 'DE'
  )
  console.log("Schema:", schema, "Customers in Germany:", DEcustomers);
}
test()

`)
</script>