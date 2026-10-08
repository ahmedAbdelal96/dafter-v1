<!-- prisma -->

npx prisma format
npx prisma validate
npx prisma migrate dev --name "initial-schema"
npx prisma migrate reset
npx prisma generate
npx prisma db seed
npm run db:seed
npm run db:studio
npm run seed
npm run prisma -- db seed

<!-- if exist erros when  make migrate run -->

npx prisma migrate resolve --rolled-back

<!--   -->

npx eslint --fix .
npx prettier --write .
npm run format

<!--  Force stop the node process -->

cd 'F:\Web\Projects\full projects\school-system\project\nestjs-school-api-v1'; Get-Process | Where-Object { $\_.ProcessName -like "_node_" } | Stop-Process -Force
