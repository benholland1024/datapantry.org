<template>
  <div class="flex-1">
    <!-- <div id="landing-gradient"></div> -->
    <div class="flex justify-around items-center min-h-[calc(100vh-4rem)]">
      <div class="max-w-[50%]">
        <p style="color:var(--blue); font-style: italic;">Turn schemas into real databases</p>
        <h2 class="text-8xl bold">Manage your databases. <br/>100% free.</h2>
        <p style="font-size: 1.5em;">
          DataPantry is still in beta. <br/>Send feedback to <a href="mailto:benholland1024@gmail.com">benholland1024@gmail.com</a>.
        </p>
        <br/>
        <button onclick="render_register_input()" id="landing-reg-btn">Register to create a database!</button>
        <button onclick="boot_side_bar();" id="landing-dash-btn">Go to your dashboard!</button>
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