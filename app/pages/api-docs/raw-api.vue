<template>
  <ColumnPageWrapper>
    <LinkableHeader tagName="h1" linkName="raw-api">
      &#x1F469;&#x200D;&#x1F4BB; Raw API (HTTP)
    </LinkableHeader>
    <p>
      You might want the raw API if you're not using NodeJS, or if you want to use
      a different HTTP client than the one provided in the NPM package. 
    </p>
  </ColumnPageWrapper>
</template>

<script setup lang="ts">
import ColumnPageWrapper from '~/components/atoms/ColumnPageWrapper.vue';
import LinkableHeader from '~/components/atoms/LinkableHeader.vue';

</script>