Below I've mentioned project ideas that I want to build, these project will be under company name rontgenai.dev I've bought the domain name.
As for initially we'll only be building 1, 2, 3, 5, 6, 9; 
4, 7, 8, 10 -> future, we'll just leave their placeholders for now
You must give beautiful names to these projects

For authentication we'll be using clerk, clerk platform gave the prompt -> clerk-prompt.md
For emailing we'll be using spacemail service; I've these 3 emails: jabir@rontgenai.dev which is mine, the other 2 -> hello@rontgenai.dev, support@rontgenai.dev
For payment gateway, initially we'll be using paddle as stripe requires a lot of documentation, later we'll move to stripe once we get some customers. paddle provided the prompt it's in this file -> paddle-prompt.md
For frontend we'll be using Typescript, Next.js, tailwind, shadcn, tanstack, Framer Motion, Zod
For Backend, we'll be using microservices and not just use the Next.js for backend too as using Next.js for backend too make the app slow; You can decide which framework should be used for building the backend microservices.
while defining the services, you must use abstraction and not hard-coding so later switching between different vendors is easy.
We'll not directly land on sign-in/sign-up page, rather land the user on a landing page, landing page should be beautiful, advanced, catchy, captivating, matching the design standards of this year, beautiful UI/UX. Should beautifully show the below products and what is product for.
For DB, we'll be using supabase.
For Object storage -> Cloudflare R2 
For Diagrams -> Mermaid + Excalidraw exports

let me know if you need any other integrations like betterstack, sentry (I've sentry subscription for 1 year), inngest, posthog, Upstash Redis
for inngest, posthog -> provide a generous free plan
Upstash Redis -> 250 mb free, Monthly Commands 500K


One other important thing in tech stack, always first strive to look for a service provider that provide the feature to be required in below apps for free provided the request or usage is within some limits eg: R2 by Cloudflare provides a generous amount of object storage for free, for deployment we've vercel and render, for database we've Supabase, since initially this project is going to be on this free tiers provided by the different providers, then later we'll get proper subscriptions or move to AWS when the volume of people gets high.

For AI, we're going to use DeepSeek, which is a cheaper option among frontier AI models.



Also, explain how the pricing and subscription should look like

here are the projects:


1. AI System Design Reviewer:

Upload architecuture diagram and receive feedback on scalability, reliability, bottlenecks, and design tradeoffs.



2. AI Data Analyst:

Chat with spreadsheets and SQL databases to generate queries, dashboards, and business insights.



3. Github Repository explainer:

Paste any Github repo and get architecture diagrams, code explanations, and onboarding guides.



4. AI Job Search Copilot:

Find jobs, tailor your resume, generate cover letters, and track applications.



5. AI Code Reviewer:

Review pull requests, catch bugs, and suggest improvements before merging. This is going to add comments to the PR on github itself, and approve the PR when changes are made and code looks good.



6. AI Github Issue Solver:

Reads Github issues, creates an implementation plan, writes code, and opens a PR.



7. AI Customer Support Agent:

Answer customer questions using company documentation with RAG.



8. AI Meeting Copilot:

Summarize meetings, extract action items, and automatically create JIRA tickets.



9. AI Production Incident Investigator:

Analyze logs, metrics, and traces to identify the root cause of production issues.



10. AI Mock Interview Coach:

Practice technical and behavioural interviews with personalized AI feedback.

