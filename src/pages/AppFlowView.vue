<template>
  <div>
    <div class="w[300px] items-center justify-center mb-4">
      <LogoutButton confirmLogout="true" variant="false" showIcon="true" label="خروج" showLabel="true"/>

    </div>
    <VueFlow></VueFlow>

  </div>
</template>
<script setup>
import LogoutButton from '@/components/LogoutButton.vue';
import VueFlow from '../components/AppFlow.vue'

</script>
<style lang="">

</style>
