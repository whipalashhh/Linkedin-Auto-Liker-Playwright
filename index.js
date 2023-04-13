const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Access Supabase URL and API key from environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the latest record from the 'profile' table
    const { data, error } = await supabase
      .from('products')
      .select('linkedin_session')
      .eq('name', 'test1')
      .limit(1);

    if (error) throw new Error(error.message);

    // Get the LinkedIn session cookie value from the fetched record
    const sessionCookie = data[0].linkedin_session;

    // Set the LinkedIn session cookie
    await context.addCookies([{
      name: 'li_at',
      value: sessionCookie,
      domain: '.linkedin.com',
      path: '/',
      expires: Date.now() / 1000 + 60 * 60 * 24 * 30, // 30 days from now
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    }]);

    // Navigate to the LinkedIn homepage
    await page.goto('https://www.linkedin.com/feed/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Get the URL of the post to like from the environment variables
    const postUrl = process.env.LINKEDIN_POST_URLS || 'https://www.linkedin.com/posts/google_scholarship-season-is-almost-here-our-partner-activity-7051219860227252224-XJr8?utm_source=share&utm_medium=member_desktop';

    // Navigate to the post to like
    await page.goto(postUrl);

    // Wait for the like button to appear and click it
    await page.waitForSelector('.react-button__trigger');
    await page.click('.react-button__trigger');

    console.log('Post liked successfully!');
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
  }
})();
