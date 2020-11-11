'use strict';

// eslint-disable-next-line import/no-unresolved
const express = require('express');
const bodyParser = require('body-parser');
const app = express()

app.use(bodyParser.json({ limit: '50mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const { getCourses } = require('./getCoursesFromRule');
const { getGeneralEducation } = require('./generalEducation');

// Routes
app.post('/getCourses', async (request, response) => {
  try {
    const rule = request.body.rule;
    const programInfo = request.body.programInfo;

    const courses = await getCourses(request.db, rule, programInfo);
    return response.json(courses);
  } catch (error) {
    return response.status(500).json({ error });
  }
});

app.post('/generalEducation', async (request, response) => {
  try {
    const programInfo = request.body.programInfo;
    const courses = await getGeneralEducation(request.db, programInfo);

    return response.json(courses);
  } catch (error) {
    return response.status(500).json({ error });
  }
});

// Error handler
app.use((err, req, res) => {
  console.error(err);
  res.status(500).send('Internal Serverless Error');
});

module.exports = app;
