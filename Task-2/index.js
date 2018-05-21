const path = require('path');
const Koa = require('koa');
const koaBody = require('koa-body');
const logger = require('koa-logger');
const Router = require('koa-router');
const static_ = require('koa-static');
const views = require('koa-views');
const orient = require('orientjs');

const dbServer = orient({
    host: 'localhost',
    port: 2424,
    username: 'root',
    password: 'root',
  });
const db = dbServer.use('items');
process.on('beforeExit', () => {
  db.close()
    .then(() => {
      dbServer.close();
      process.exit();
    });
});

const app = new Koa();

// app.use(logger());

app.use(static_(path.join(__dirname, '/views'), { defer: true }));

app.use(koaBody());

app.use(views(path.join(__dirname, '/views')));

const feedback = async ctx => {
    console.debug(ctx.request.body);
    const mapped = {
        eMail: ctx.request.body.eMail,
        name: ctx.request.body.name,
        message: ctx.request.body.message,
      };
    console.debug(mapped);
    await db.query(
        'CREATE VERTEX Feedback CONTENT { EMail: :eMail, Name: :name, Message: :message }',
        { params: mapped },
      );
    ctx.redirect('back', '/');
  };

const items = async ctx => {
    const result = await db.query('SELECT Id, Name, Description.Paragraphs[0].Text AS ShortDescription FROM Item');
    console.debug(result);
    const mapped = result.map(_ => { return { id: _.Id, name: _.Name, shortDescription: [_.ShortDescription] }; });
    console.debug(mapped);
    await ctx.render('./items.ejs', { items: mapped });
  };

const itemAt = async ctx => {
    const result = await db.query(
        'SELECT Title, Name, Description.Paragraphs.Text AS Description FROM Item WHERE Id = :id LIMIT 1',
        { params: { id: ctx.params.id } },
      );
    console.debug(result);
    const item = {
        name: result[0].Name,
        title: result[0].Title,
        description: result[0].Description,
      };
    console.debug(item);
    await ctx.render('./items/item.ejs', { item })
  };

const router = new Router();
router
  .post('/feedback', feedback)
  .get('/items', items)
  .get('/items/:id', itemAt);
app.use(router.routes());

app.listen(3000);
