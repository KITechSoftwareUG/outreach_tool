FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV VITE_SUPABASE_URL=https://liwsbhdsgkzskbpxjvzm.supabase.co
ENV VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpd3NiaGRzZ2t6c2ticHhqdnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzU0NTEsImV4cCI6MjA4OTAxMTQ1MX0.ym7lTlLuRGJOhIcqBxr72hU6AdUY7XqpkJvxoBcg3jw
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
