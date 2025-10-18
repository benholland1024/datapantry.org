

<template>
  <ColumnPageWrapper>
    <LinkableHeader tagName="h1" linkName="how-to-use-the-npm-package">
      &#128274; Security
    </LinkableHeader>
    <p>
      DataPantry uses API keys to authenticate requests. 
      Make sure to keep your API keys secure and never expose them in client-side code.
    </p>
  </ColumnPageWrapper>
</template>

<script setup lang="ts">
import ColumnPageWrapper from '~/components/atoms/ColumnPageWrapper.vue';
import LinkableHeader from '~/components/atoms/LinkableHeader.vue';
</script>