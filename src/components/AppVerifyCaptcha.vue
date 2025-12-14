<template>
  <div class="captcha-container">
    <div v-if="showCaptcha" class="captcha-wrapper">
      <!-- CAPTCHA Image -->
      <div class="captcha-image">
        <img :src="captchaImage" alt="CAPTCHA" class="rounded-lg shadow-md" />

      </div>

      <!-- Input Field -->
      <div class="captcha-input">
        <input v-model="userInput" @keyup.enter="verifyCaptcha" type="text" placeholder="کد را وارد کنید" class="w-full h-12 px-4 text-right rounded-lg border
                 border-orange-300 bg-white/80 backdrop-blur-sm
                 focus:bg-white focus:border-orange-500 focus:ring-4
                 focus:ring-orange-200/50 outline-none transition-all
                 text-gray-800 placeholder-gray-500" autocomplete="off" />
      </div>
      <button @click.prevent="generateCaptcha" class="refresh-btn tooltip" data-tooltip="تولید مجدد کپچا"
        aria-label="تولید مجدد کپچا">
        <font-awesome-icon :icon="['fa', 'fa-refresh']" style="color: orange;z-index:99999" />
      </button>
    </div>

    <!-- Submit Button -->
    <button type="button" @click="verifyCaptcha" class="verify-btn" :disabled="!userInput.trim()">
      تأیید کپچا
    </button>
    <div class="text-right chapchata-message">
      <p v-if="verificationMessage" :class="{ success: isVerified, error: !isVerified }">
        {{ verificationMessage }}
      </p>
    </div>

  </div>
</template>
<script>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faRefresh, faTrash } from "@fortawesome/free-solid-svg-icons";
import { library } from "@fortawesome/fontawesome-svg-core";

library.add(faTrash, faRefresh);


export default {
  name: "CaptchaComponent",
  components: {
    FontAwesomeIcon,
  },
  mounted() {
    this.generateCaptcha();
  },

  unmounted() {
    clearTimeout(this.verificationTimeout);
  },

  data() {
    return {
      showCaptcha: true,
      captchaText: "",
      captchaImage: "",
      userInput: "",
      verificationMessage: "",
      verificationMessageDuration: 3000,
      isVerified: false,
    };
  },
  // watch: {
  //   userInput(newVal) {
  //     if (newVal.trim()) {
  //       this.verifyCaptcha();
  //     }
  //   },
  // },
  methods: {
    generateRandomText(length = 6) {
      const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
      return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    },

    generateCaptcha() {
      this.captchaText = this.generateRandomText();
      this.captchaImage = this.createCaptchaImage(this.captchaText);
      this.userInput = "";
      this.verificationMessage = "";
    },

    createCaptchaImage(text) {
      const canvas = document.createElement("canvas");
      canvas.width = 220;
      canvas.height = 90;
      const ctx = canvas.getContext("2d");

      // Background
      ctx.fillStyle = "#fff8f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Noise dots
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = `rgba(${Math.random() * 100 + 150}, ${Math.random() * 100 + 100}, 100, 0.3)`;
        ctx.beginPath();
        ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wavy lines
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = `rgba(255, ${Math.random() * 100 + 100}, 0, 0.4)`;
        ctx.lineWidth = 2 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(0, Math.random() * canvas.height);
        ctx.quadraticCurveTo(
          canvas.width / 2,
          Math.random() * canvas.height,
          canvas.width,
          Math.random() * canvas.height
        );
        ctx.stroke();
      }

      // Text
      ctx.font = "bold 42px 'Vazirmatn', Arial";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      text.split("").forEach((char, i) => {
        const x = 40 + i * 35;
        const y = canvas.height / 2 + (Math.random() - 0.5) * 20;
        const rotate = (Math.random() - 0.5) * 0.6;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotate);
        ctx.fillStyle = ["#d35400", "#e67e22", "#f39c12", "#e74c3c"][i % 4];
        ctx.fillText(char, 0, 0);
        ctx.restore();
      });

      return canvas.toDataURL("image/png");
    },

    verifyCaptcha() {
      //:TODO Add your verification logic here
      if (this.userInput.toLowerCase() === this.captchaText.toLowerCase()) {
        this.isVerified = true;
        this.verificationMessage = "! کپچا با موفقیت تأیید شد";
        this.showCaptcha = false;
        this.$emit("verified", this.isVerified); // optional
      } else {
        this.isVerified = false;
        this.verificationMessage = "کد اشتباه است. دوباره امتحان کنید.";
        this.generateCaptcha();
      }
    },
  },
};
</script>

<style scoped>
.captcha-container {
  max-width: 439px;
  /* margin: 2rem auto; */
  /* padding: 1.5rem; */
  font-family: 'Vazirmatn', system-ui, sans-serif;
  display: flex;
  flex-flow: row wrap;
  gap: 2;
}

.captcha-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  /* margin-bottom: 1.5rem; */
  flex-wrap: wrap;
}

.captcha-image {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.captcha-image img {
  display: block;
  width: 100%;
  max-width: 220px;
  border-radius: 0.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.refresh-btn {
    position: relative;
    top: -95px;
    left: 5px;
    width: 32px;
    height: 32px;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: grid;
    place-items: center;
    font-size: 18px;
    transition: all 0.2s;
}

.refresh-btn:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: scale(-10px) scale(10px);
  transition: all 0.6s;
}

.captcha-input {
   flex: 1;
  min-width: 180px;
}

.verify-btn {
  width: 100%;
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
  font-weight: bold;
  background: linear-gradient(to right, #f97316, #f59e0b);
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);
}

.verify-btn:hover {
  background: linear-gradient(to right, #ea580c, #d97706);
  transform: translateY(-2px);
}
.chapchata-message{
  color: #16a34a;
    font-weight: bold;
    width: 100%;
    padding-top:10px;
    padding-right: 3px;
}
.verify-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.success {
  color: #16a34a;
  font-weight: bold;
}

.error {
  color: #dc2626;
  font-weight: bold;
}

@media (max-width: 480px) {
  .captcha-wrapper {
    flex-direction: column;
    align-items: stretch;
  }

  .captcha-image img {
    max-width: 100%;
  }

  .captcha-container {
    max-width: 100%;
    min-width: 100%;
    width: 100vw;
    display: block;
  }

  .captcha-input input {
    margin-top: 2em;
  }
}
</style>
