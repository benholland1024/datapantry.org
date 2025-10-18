<template>
  <ColumnPageWrapper>
    <LinkableHeader tagName="h1" linkName="api-basics">&#128118; API Basics</LinkableHeader>

    <p class="!mb-16">
      You want to make a website - let's say, paperclip-collections.com. 
      You want to have "dynamic data" on your website, 
      like user profiles, or a list of paperclip pictures, that you can add, 
      change, and delete without changing your websites code.  
    </p>

    <p>
      The traditional way to do this is with a <b>backend</b> - a server that sends 
      your website to users, and also listens for requests to get or change data.  
      The backend talks to a <b>database</b> - a place to store your data. 
    </p>

    <p>
      The website (the <b>frontend</b>) talks to the backend by using an <b>API</b> -
      a set of rules for how to ask for data, and how to change it. For example, to 
      get a list of paperclip brands, the frontend makes an API request that looks like this: 
    </p>
    <CodeRender 
      :code="`GET /api/paperclip-brands HTTP/1.1
Host: paperclip-collections.com
Authorization: Bearer YOUR_API_KEY`" 
      language="http" 
      class="mb-4" filename="This is what an API request looks like."
      :show-copy="false"
    />

    <p>
      Pretty dull stuff! But the backend understands this request, and 
      responds with a list of thrilling paperclip brands.  The whole interaction looks like this:
    </p>

    <div class="flex mb-8">
      <NiceImage 
        src="/docs/api_example.png"
        caption="Example of the frontend making an API request"
      />
    </div>

    <p class="mt-16">
      For this setup, your backend needs to talk with a database before responding.  
      In the middle panel of the comic above, the backend could either be talking to a
      traditional, self-hosted database, or it could be talking to DataPantry's API.  
    </p>

    <p>
      DataPantry lets you create and manage databases visually. You create tables by clicking 
      a button, not with code. Your backend <i>will</i> need to make an extra API request to 
      datapantry.org, but that's easy to do, especially with the NPM package.   
    </p>

    <p>
      It also means an extra 50-100ms of latency - not noticable in most cases. We're working on 
      a local version of DataPantry, which will eliminate this latency, and remove the need 
      to use your API key.  When this arrives, it'll be easy to move from the cloud version to 
      the local version, if that's what you'd prefer!
    </p>

    <p class="mt-16">
      One last thing: Why can't you call the DataPantry API directly from your frontend code?
    </p>
    <p>
      Because your API key is secret! If you put it in your frontend code, anyone can see it, 
      and use it to add silly data to your database. Always make API requests from your backend!
    </p>
    <p class="mb-16">
      If you're not sure how to make API requests, check out the 
      <NuxtLink to="/api-docs/npm-package" class="text-blue-500 hover:underline">NPM package</NuxtLink> 
      or 
      <NuxtLink to="/api-docs/raw-api" class="text-blue-500 hover:underline">raw HTTP API</NuxtLink> pages.
    </p>
  </ColumnPageWrapper>
</template>

<script setup lang="ts">
import ColumnPageWrapper from '~/components/atoms/ColumnPageWrapper.vue';
import NiceImage from '~/components/atoms/NiceImage.vue';
import LinkableHeader from '~/components/atoms/LinkableHeader.vue';
import CodeRender from '~/components/atoms/CodeRender.vue';
</script>