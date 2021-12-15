const comments = require('./data/comments.json');
const albumns = require('./data/albumns.json');
const photos = require('./data/photos.json');
const posts = require('./data/posts.json');
const todos = require('./data/todos.json');
const users = require('./data/users.json');


module.exports = {
    'GET /api/comments': comments,
    'GET /api/albumns': albumns,
    'GET /api/photos': photos,
    'GET /api/posts': posts,
    'GET /api/todos': todos,
    'GET /api/users': users,
    'GET /api/details': usePerson()
}