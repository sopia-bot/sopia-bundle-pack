import { Router } from 'express';

const router = Router();

router.post('/', async (req, res) => {
    res.status(200).json({ message: 'User created' });
});

export default router;