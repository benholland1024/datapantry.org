<template>
  <DocsPageWrapper>
    <!------------->
    <!--  Intro  -->
    <!------------->
    <LinkableHeader tagName="h1" linkName="api-guide">&#128225; API Guide</LinkableHeader>
    <p class="mb-8">
      I can picture you now - you're grinding your teeth and pounding on the table, crying out...
      <i>I have all these beautiful tables! How do I get data in and out of them??</i> CALM DOWN. Calm down, it's okay. DataPantry has a 
      RESTful API that you can use to access your data programmatically, on your very own website.  
      Whew!
    </p>

    <p>
      The first step is to get the API key from your database - each database has one. You
      can copy it from your <NuxtLink to="/dashboard" class="text-blue-500 hover:underline">dashboard</NuxtLink>
      or from the schema diagram editor.  
    </p>

    <p>
      The API key will look something like this: <code>"asdfghjklqwertyhiimanapikeyzxcvnm"</code>. Keep it secret!
    </p>

    <div class="flex mb-8">
      <NiceImage 
        src="/docs/api_key_in_the_schema.png"
        caption="Location of API key in schema"
      />
    </div>

    <p>
      Then, choose how you want to make API requests.
      If you're not sure how API requests work, check out the 
      <NuxtLink to="/api-docs/api-basics" class="text-blue-500 hover:underline">API Basics</NuxtLink> page.
    </p>

    <div>
      You have two options for making API requests:
      <ul>
        <li class="list-disc ml-8 mt-4">
          Use the  
          <NuxtLink to="/api-docs/npm-package" class="text-blue-500 hover:underline">
            DataPantry NPM package
          </NuxtLink> if you're using NodeJS. It wraps the raw API and makes it easy to use.
          This option is recommended. You deserve nice things.
        </li>
        <li class="list-disc ml-8 mt-4">
          Use the 
          <NuxtLink to="/api-docs/raw-api" class="text-blue-500 hover:underline">
            raw HTTP API
          </NuxtLink> if you're not using NodeJS, or if you want to use a different HTTP client.
          This option is also pretty easy to use, and more customizable. You can do it!
        </li>
      </ul>
    </div>

    <p class="mt-8">
      The two methods are documented in their own pages (click the links above).  
      For either method, you add your API key, and then make requests to read 
      or modify your data. 
    </p>

    <div class="bg-yellow-900 border-l-4 border-yellow-500 text-yellow-200 p-4 mt-8 mb-16">
      &#9888; <strong>BEWARE:</strong> Don't expose your API key in client-side code! 
      Make sure to make API requests from your server <i>only</i>. <br/><br/>
      I will personally go to your website, find your API key, and add a bunch of 
      silly data to your database if you expose your key. Don't make me do this.
    </div>

    <p>
      Okay, you should be ready to rock. Have fun out there.  &#128640;
    </p>
      
  </DocsPageWrapper>
</template>

<script setup lang="ts">

import DocsPageWrapper from '~/components/atoms/DocsPageWrapper.vue';
import CodeRender from '~/components/atoms/CodeRender.vue';
import LinkableHeader from '~/components/atoms/LinkableHeader.vue';
import NiceImage from '~/components/atoms/NiceImage.vue';

</script>