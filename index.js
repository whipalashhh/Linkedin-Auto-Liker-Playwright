const { chromium } = require('playwright');
const { Machine, interpret } = require('xstate');

const USERNAME = process.env.LINKEDIN_USERNAME || '1503palash@gmail.com';
const PASSWORD = process.env.LINKEDIN_PASSWORD || 'Palashpalash@123';
const ALL_POST_URL = process.env.ALL_POST_URL || 'https://www.linkedin.com/posts/google_scholarship-season-is-almost-here-our-partner-activity-7051219860227252224-XJr8?utm_source=share&utm_medium=member_desktop';
const COMPANY_NAME = process.env.COMPANY_NAME || 'Google';
const TIME_INTERVAL = Number.parseInt(process.env.TIME_INTERVAL) || 30000;

const autoLikerMachine = Machine({
  id: 'autoLiker',
  initial: 'login',
  states: {
    login: {
      on: {
        LOGIN_SUCCESS: 'likePosts',
        LOGIN_FAILURE: 'login',
      },
      async entry(context) {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto('https://www.linkedin.com/checkpoint/rm/sign-in-another-account?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin');
        await page.fill('input[name="session_key"]', USERNAME);
        await page.fill('input[name="session_password"]', PASSWORD);
        await Promise.all([
          page.waitForNavigation(),
          page.click('button[type="submit"]'),
        ]);

        if (page.url() === 'https://www.linkedin.com/feed/') {
          context.browser = browser;
          context.page = page;
          context.attempts = 0;
          this.send('LOGIN_SUCCESS');
        } else {
          await browser.close();
          this.send('LOGIN_FAILURE');
        }
      },
    },
    likePosts: {
      on: {
        NEXT_POST: 'likePosts',
        FINISH: 'logout',
      },
      async entry(context) {
        try {
          await context.page.goto(ALL_POST_URL);
          await context.page.click(`button[aria-label="Aimer le post de ${COMPANY_NAME}"]`);
          console.log('New post liked');
        } catch (error) {
          console.log('No new post');
        }
        context.attempts++;

        if (context.attempts < 3) {
          this.send('NEXT_POST');
        } else {
          this.send('FINISH');
        }
      },
    },
    logout: {
      async entry(context) {
        await context.browser.close();
      },
    },
  },
});

const service = interpret(autoLikerMachine);

service.onTransition((state) => {
  console.log(`Transition: ${state.value}`);
  if (state.done) {
    console.log('Auto liker finished');
    process.exit(0);
  }
});

const startAutoLiker = () => {
  service.send('LOGIN_SUCCESS');
};

console.log('Auto liker started');
startAutoLiker();
setInterval(startAutoLiker, TIME_INTERVAL);
