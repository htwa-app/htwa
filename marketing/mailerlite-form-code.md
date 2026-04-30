# HTWA — MailerLite Form Code
> Saved 30 April 2026. Use this when integrating the waiting list form into the website.

## Account ID
2305403

## Form ID
p3xCkw

## Preview URL
https://preview.mailerlite.io/forms/2305403/186166709607990629/share

---

## 1. Universal Script (goes in <head> on every page)
```html
<!-- MailerLite Universal -->
<script>
    (function(w,d,e,u,f,l,n){w[f]=w[f]||function(){(w[f].q=w[f].q||[])
    .push(arguments);},l=d.createElement(e),l.async=1,l.src=u,
    n=d.getElementsByTagName(e)[0],n.parentNode.insertBefore(l,n);})
    (window,document,'script','https://assets.mailerlite.com/js/universal.js','ml');
    ml('account', '2305403');
</script>
<!-- End MailerLite Universal -->
```

---

## 2. Embedded Form Div (place where form should appear)
```html
<div class="ml-embedded" data-form="p3xCkw"></div>
```

---

## 3. Fields Collected
- Name
- Email
- City
- Phone

---

## 4. Success Message
"Thank you! You have successfully joined our subscriber list."

---

## 5. Notes
- Button colour in MailerLite is set to lavender (#C8B8E8) — Claude Code should override this to teal (#1F7A78) with white text in the website CSS
- Form background is teal (#1F7A78) — Claude Code should override to off-white (#F7F3ED) to match site
- Font is Poppins throughout — correct
- The full raw HTML embed code is available from MailerLite dashboard if needed
