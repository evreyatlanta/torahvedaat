// Only this historical PayPal return path redirects. Other 404s stay visible.
if (location.pathname === '/donate.aspx') {
    location.replace(`/donate/${location.search}${location.hash}`);
}
