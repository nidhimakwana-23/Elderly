import express, { type Request, type Response } from 'express';

const app = express();
const port = process.env.PORT || 3001;

app.get('/api', (req: Request, res: Response) => {res.json({ message: 'Hello from Express Server with TypeScript!' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
