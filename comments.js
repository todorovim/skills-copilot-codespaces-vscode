// Create web server 
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto'); // Generate random ID
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const commentsByPostId = {};

// Get all comments for a post
app.get('/posts/:id/comments', (req, res) => {
	res.send(commentsByPostId[req.params.id] || []);
});

// Create a new comment for a post
app.post('/posts/:id/comments', async (req, res) => {
	const commentId = randomBytes(4).toString('hex');
	const { content } = req.body;

	// Get comments for post
	const comments = commentsByPostId[req.params.id] || [];

	// Add new comment to comments array
	comments.push({ id: commentId, content, status: 'pending' });

	// Update comments for post
	commentsByPostId[req.params.id] = comments;

	// Emit event to event bus
	await axios.post('http://event-bus-srv:4005/events', {
		type: 'CommentCreated',
		data: {
			id: commentId,
			content,
			postId: req.params.id,
			status: 'pending'
		}
	});

	// Return new comments array
	res.status(201).send(comments);
});

// Receive events from event bus
app.post('/events', async (req, res) => {
	console.log('Event Received:', req.body.type);

	const { type, data } = req.body;

	if (type === 'CommentModerated') {
		const { postId, id, status, content } = data;

		// Get comments for post
		const comments = commentsByPostId[postId];

		// Find comment in comments array
		const comment = comments.find(comment => {
			return comment.id === id;
		});

		// Update comment status
		comment.status = status;

		// Emit event to event bus
		await axios.post('http://event-bus-srv:4005/events', {
			type: 'CommentUpdated',
			data: {
				id,
				status,
				postId,
				content
			}
		});
	}

	res.send({});
});

app.listen(4001, () => {
	console.log('Listening on
