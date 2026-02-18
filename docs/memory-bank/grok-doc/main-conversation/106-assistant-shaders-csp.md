# Turn 106 (ASSISTANT) — Lines 14009-14037

**Summary**: ✅ CSP Explained – Simple & Clear
**Topics**: shaders, csp
**Code**: 2 | **New**: YES | **Design**: no | **Definitive**: no

---

**✅ CSP Explained – Simple & Clear**

### What is CSP (Content Security Policy)?

CSP is a security feature built into modern browsers. It’s like a "whitelist" that tells the browser exactly what kinds of code and resources are allowed to run on your website.

Its main job is to **prevent attackers** from injecting malicious JavaScript (e.g., if someone hacks your site or you load untrusted content).

### Why CSP Blocks 'eval' and Many Shaders

The error you saw:

> "Content Security Policy of your site blocks the use of 'eval' in JavaScript"

…happens because many shader examples (especially older Three.js or raw WebGL ones) do this:

```js
new Function("...dynamic shader code...")   // or eval()
```

This is considered dangerous by CSP, so the browser refuses to run it.

**Your shadcn/Next.js project** has a strict CSP by default (this is good for security), which is why some shader components fail immediately.

### How We Solved It

In all the code I’ve given you in the last few messages, **I already made everything