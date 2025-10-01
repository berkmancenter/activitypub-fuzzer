import express from 'express'; // Import express module

const router = express.Router();

router.get('/2.0', async (req, res) => {
  const nodeinfo = {
    version: '2.0',
    software: {
      name: 'activitypub-fuzzer',
      version: '1.0.0',
    },
    protocols: ['activitypub'],
    services: {
      outbound: [],
      inbound: [],
    },
    openRegistrations: false,
    usage: {
      users: {
        total: 1,
        activeHalfyear: 1,
        activeMonth: 1,
      },
      localPosts: 0,
      localComments: 0,
    },
    metadata: {},
  };
  res.json(nodeinfo);
});

export default router;
