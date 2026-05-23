export const getHeader = (title, lang = "vi") => {
  const subtitle = lang === "vi" 
    ? "HỆ THỐNG QUẢN LÝ CÔNG VIỆC DOANH NGHIỆP" 
    : "ENTERPRISE TASK MANAGEMENT SYSTEM";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FFF9E6;
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1A1A1A;
    }
    .wrapper {
      width: 100%;
      background-color: #FFF9E6;
      padding: 30px 15px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border: 3px solid #000000;
      box-shadow: 6px 6px 0px #000000;
      padding: 40px 30px;
      box-sizing: border-box;
    }
    .logo-container {
      background-color: #FF5A5F;
      border: 3px solid #000000;
      padding: 15px;
      text-align: center;
      margin-bottom: 30px;
      box-shadow: 4px 4px 0px #000000;
    }
    .logo-text {
      color: #FFFFFF;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 2px;
      margin: 0;
      text-shadow: 2px 2px 0px #000000;
      text-transform: uppercase;
    }
    .subtitle {
      color: #000000;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      margin: 5px 0 0 0;
      opacity: 0.8;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="wrapper" style="width: 100%; background-color: #FFF9E6; padding: 30px 15px; box-sizing: border-box; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 3px solid #000000; box-shadow: 6px 6px 0px #000000; padding: 40px 30px; box-sizing: border-box; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div class="logo-container" style="background-color: #FF5A5F; border: 3px solid #000000; padding: 15px; text-align: center; margin-bottom: 30px; box-shadow: 4px 4px 0px #000000;">
        <h1 class="logo-text" style="color: #FFFFFF; font-size: 26px; font-weight: 900; letter-spacing: 2px; margin: 0; text-shadow: 2px 2px 0px #000000; text-transform: uppercase; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">⚡ TASK.DO ⚡</h1>
        <p class="subtitle" style="color: #000000; font-size: 10px; font-weight: 800; letter-spacing: 1px; margin: 5px 0 0 0; opacity: 0.8; text-transform: uppercase; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${subtitle}</p>
      </div>
  `;
};
