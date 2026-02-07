<template>
  <div class="captcha-container">
    <div class="captcha-wrapper">
      <div class="captcha-image">
        <img
          v-if="captchaImage"
          :src="captchaImage"
          alt="CAPTCHA"
          class="rounded-lg shadow-md"
        />
        <button
          @click="fetchCaptcha"
          class="refresh-btn"
          aria-label="تولید مجدد کپچا"
        >
          <font-awesome-icon :icon="['fa', 'fa-refresh']" />
        </button>
      </div>

      <div class="captcha-input">
        <input
          v-model="captchaValue"
          type="text"
          placeholder="کد امنیتی"
          autocomplete="off"
          class="w-full h-12 px-4 text-right rounded-lg border border-orange-300
                 focus:border-orange-500 focus:ring-4 focus:ring-orange-200/50"
        />
      </div>
    </div>
  </div>
</template>

<script>
import serviceAggregatorClient from "../utils/service-aggregator-client"; // axios instance

export default {
  name: "CaptchaComponent",

  emits: ["update"],

  data() {
    return {
      captchaImage: "",
      captchaKey: "",
      captchaValue: "",
    };
  },

  mounted() {
    this.fetchCaptcha();
  },

  watch: {
    captchaValue() {
      this.emitCaptcha();
    },
  },

  methods: {
    async fetchCaptcha() {
      try {
        const data  = await serviceAggregatorClient.getCaptcha();

        this.captchaImage = data.image;
        this.captchaKey = data.key;
        this.captchaValue = "";

        this.emitCaptcha();
      } catch (err) {
        console.error("Captcha load failed", err);
      }
    },

    emitCaptcha() {
      this.$emit("update", {
        captcha: this.captchaValue,
        key: this.captchaKey,
      });
    },
  },
};
</script>
<style scoped>
 .captcha-wrapper{
      display: flex;
    justify-content: space-between;
 }

</style>
