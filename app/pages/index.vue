<template>
  <div class="flex-1">
    <!-- <div id="landing-gradient"></div> -->
    <div class="flex justify-around items-center min-h-[calc(100vh-4rem)]">
      <div class="max-w-[50%]">
        <p style="color:var(--blue); font-style: italic;">Turn schemas into real databases</p>
        <h2 class="text-8xl bold">Manage your databases. <br/>Soup.</h2>
        <p style="font-size: 1.5em;">
          DataPantry is still in beta. <br/>Send feedback to <a href="mailto:benholland1024@gmail.com">benholland1024@gmail.com</a>.
        </p>
        <br/>
        <div class="flex gap-4 mb-8">
          <UButton color="bg3" class="text-white" onclick="render_register_input()">
            Register to create a database!
          </UButton>
          <UButton color="bg3" class="text-white" onclick="boot_side_bar();">
            Go to your dashboard!
          </UButton>
        </div>
      </div>
      <div id="landing-image">
        <img src="/DataPantryLogo.png" alt="Landing Image" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';


</script>