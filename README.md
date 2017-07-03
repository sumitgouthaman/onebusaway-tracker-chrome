OneBusAway Tracker Chrome extension
===================================
This is a handy little extension that lets you monitor bus stops near you for
arrival times of upcoming buses.  

**Bug Fixes / Features / Documentation contributions welcome**.

### Screenshot
![Extension popup](/screenshots/popup.png "Extension popup")

### OneBusAway
- This app is powered by the [OneBusAway API](https://onebusaway.org/).  
- This app is not officially provided by OneBusAway.  

### How to run the extension
1. Make sure your local transit agency uses OneBusAway. This might be mentioned
on their website. For eg. here's [Sound Transit's](https://www.soundtransit.org/Open-Transit-Data)
open transit data website.
1. Update `app/apikey.js` with the API_URL and KEY.
    1. For Sound Transit the API_URL is `https://api.pugetsound.onebusaway.org`.
    This may vary based on your local transit agency. Check their website for details.  
    2. The KEY can be obtained by emailing your local transit agency. For
    Sound Transit, send an email to [OBA_API_Key@soundtransit.org](mailto:OBA_API_Key@soundtransit.org?subject=API%20Key%20request).  
1. The `app` folder contains the extension code. You can load this in chrome
as an **unpacked extension** by following the instructions [here](https://developer.chrome.com/extensions/getstarted#unpacked).  