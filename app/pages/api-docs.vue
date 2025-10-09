<template>
  <div class="pl-16 pr-8 pb-50 pt-25 max-w-4xl mx-auto [&>a]:text-blue-500 [&>a]:hover:underline
    h-[calc(100vh-64px)] overflow-y-scroll
    [&>p]:mb-4 [&>p]:relative
    [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4
    [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-2 [&>h2]:mt-50 [&>h2]:relative
    [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-2 [&>h3]:mt-8 [&>h3]:relative" 
    data-scroll-container
  >
    <LinkableHeader tagName="h1" linkName="api-guide">&#128225; API Guide</LinkableHeader>
    <p>
      You may want to use your database in an actual website. If so, you're in the right place!
    </p>

    <p>
      <span class="absolute -left-8 block">&#128273;</span>
      The first step is to get the API key from your database. You
      can copy it from your <NuxtLink to="/dashboard">dashboard</NuxtLink>
      or from the schema diagram editor.
    </p>

    <p>
      <span class="absolute -left-8 block">&#x1F6DC;</span>
      Then, choose how you want to make API requests.
      If you're not sure how API requests work, check out the 
      <a href="#api-basics" class="text-blue-500 hover:underline">API Basics</a> section below.
    </p>

    <p>
      <span class="absolute -left-8 block">&#x1F4E6; </span>
      If you're building a JS project, I recommend our 
      <a href="https://www.npmjs.com/package/datapantry" 
        target="_blank" 
        class="text-blue-500 hover:underline"
      >
        Datapantry NPM package
      </a>,
      which wraps the API and makes it easy to use.
    </p>

    <h2>&#x1F96B; How to Use the Datapantry NPM Package</h2>
    <p>The NPM package is perfect if you're using NodeJS for your server.</p>

    <h3>1. Install the package</h3>
    <p>To get started, run this:</p>
    <CodeRender :code="`npm install datapantry`" language="bash" class="mb-4"/>

    <p>Here's an example of how it might be used in a Node.js application:</p>
  </div>
</template>

<script setup lang="ts">

import CodeRender from '~/components/atoms/CodeRender.vue';
import LinkableHeader from '~/components/atoms/LinkableHeader.vue';

</script>