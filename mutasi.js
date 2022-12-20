const puppeteer = require('puppeteer');
require('dotenv').config();

var startTime, endTime;

function start() {
  startTime = new Date();
};

function end() {
  endTime = new Date();
  var timeDiff = endTime - startTime; //in ms
  // strip the ms
  timeDiff /= 1000;

  // get seconds 
  var seconds = Math.round(timeDiff);
  console.log(seconds + " seconds");
}


if (
  !process.env.KLIKBCA_USER &&
  !process.env.KLIKBCA_PASSWORD
) {
  return console.log("Please edit the .env file with your KlikBCA credential!!!");
}

(async () => {
  start()
  let launchOptions = { headless: true };
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  const idletime = 2500;
  try {
    // set some options (set headless to false so we can see 
    // this automated browsing experience)

    // let's go to the BCA internet banking website

    await page.setViewport({ width: 1366, height: 768 });
    await page.goto('https://ibank.klikbca.com');

    // do the login
    await page.type('#user_id', process.env.KLIKBCA_USER);
    await new Promise(r => setTimeout(r, idletime));
    await page.type('#pswd', process.env.KLIKBCA_PASSWORD);
    await new Promise(r => setTimeout(r, idletime));
    await page.waitForSelector('input[value="LOGIN"]');
    await page.click('input[value="LOGIN"]');

    await new Promise(r => setTimeout(r, idletime));
    // get the account name, this is inside an iframe
    var frame = page.frames().find(fr => fr.name() === 'atm');
    var accountName = await frame.evaluate(() => document.querySelectorAll('center')[0].textContent);
    accountName = accountName.substring(0, accountName.indexOf(',')).trim();
    await new Promise(r => setTimeout(r, idletime));
    // doing click on left menu, account information, 
    // this menu is inside an iframe
    var frame = page.frames().find(fr => fr.name() === 'menu');
    await new Promise(r => setTimeout(r, idletime));
    await frame.waitForSelector('a[href="account_information_menu.htm"]');
    await frame.click('a[href="account_information_menu.htm"]');
    await new Promise(r => setTimeout(r, idletime));
    // doing click again on left menu, balance inquiry, 
    // this menu is still inside an iframe	
    await frame.evaluate(() => document.querySelectorAll('table')[2].querySelectorAll('tr')[1].querySelectorAll('td')[1].querySelector('a').click());
    await new Promise(r => setTimeout(r, idletime));
    // now go to iframe that display the balance (on the right side)
    // and scrape the balance data there
    frame = page.frames().find(fr => fr.name() === 'atm');
    await new Promise(r => setTimeout(r, idletime));
    await frame.waitForSelector('input[type=submit]');
    await frame.click('input[type=submit]');
    await new Promise(r => setTimeout(r, idletime));

    frame = page.frames().find(fr => fr.name() === 'atm');
    const mutasi = await frame.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('table:nth-child(4) > tbody > tr:nth-child(2) > td > table > tbody > tr');
      let index = 0;
      for (const row of rows) {
        if (index !== 0) {
          const tanggal = row.querySelectorAll('td')[0].textContent.trim();
          const keterangan = row.querySelectorAll('td')[1].textContent.trim().replace(/\s\s+/g, ' ').replace(" - - ", " - ");
          const cab = row.querySelectorAll('td')[2].textContent.trim();
          const mutasi = row.querySelectorAll('td')[3].textContent.trim();
          const type = row.querySelectorAll('td')[4].textContent.trim();
          const saldo = row.querySelectorAll('td')[5].textContent.trim();


          const obj = {
            tanggal,
            keterangan,
            cab,
            mutasi,
            type,
            saldo
          }
          results.push(obj)
        }
        index += 1
      }
      return results;
    })
    console.log(mutasi);
    await new Promise(r => setTimeout(r, idletime));
    // display BCA balance (plus account number, account type and currency type)

    // console.log(balanceInfo);

    // do logout so everybody happy and respect the service
    // logout link is inside in iframe
    frame = page.frames().find(fr => fr.name() === 'header');
    await frame.evaluate(() => document.querySelectorAll('a')[0].click());
    await new Promise(r => setTimeout(r, idletime));

    // close the browser
    await browser.close();
    end()
  }
  catch (error) {
    console.log(error, "error");
    await Promise.all([
      page.goto(
        "https://ibank.klikbca.com/authentication.do?value(actions)=logout"
      ),
      page.waitForNavigation({ waitUntil: "networkidle0" })
    ]);

    await browser.close();
    end()
    return error;
  }
})();