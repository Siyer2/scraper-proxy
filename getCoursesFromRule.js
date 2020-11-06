const axios = require('axios');
const _ = require('lodash');

// Dynamic Queries
function convertRuleToQueryString(rule) {
    const isLike = rule["map"].operator_value === 'LIKE';
    const startsWith = rule["map"].operator_value === 'STARTSWITH';

    var queryString;
    switch (rule["map"].field) {
        case 'cs_tags':
            queryString = {
                "query_string": {
                    "fields": [
                        "unsw_psubject.csTags"
                    ],
                    "query": startsWith ? `${rule["map"].input_value}*` : (isLike ? `*${rule["map"].input_value}*` : rule["map"].input_value)
                }
            }
            break;
        case 'parent_academic_org':
            queryString = {
                "query_string": {
                    "fields": [
                        "unsw_psubject.parentAcademicOrg"
                    ],
                    "query": startsWith ? `${rule["map"].input_value}*` : (isLike ? `*${rule["map"].input_value}*` : rule["map"].input_value)
                }
            }
            break;
        case 'level':
            queryString = {
                "query_string": {
                    "fields": [
                        "unsw_psubject.levelNumber"
                    ],
                    "query": startsWith ? `${rule["map"].input_value}*` : (isLike ? `*${rule["map"].input_value}*` : rule["map"].input_value)
                }
            }
            break;
        case 'academic_org':
            queryString = {
                "query_string": {
                    "fields": [
                        "unsw_psubject.academicOrg"
                    ],
                    "query": startsWith ? `${rule["map"].input_value}*` : (isLike ? `*${rule["map"].input_value}*` : rule["map"].input_value)
                }
            }
            break;
        case 'code':
            queryString = {
                "query_string": {
                    "fields": [
                        "unsw_psubject.code"
                    ],
                    "query": startsWith ? `${rule["map"].input_value}*` : (isLike ? `*${rule["map"].input_value}*` : rule["map"].input_value)
                }
            }
            break;

        default:
            break;
    }

    return queryString;
}

function convertDynamicQueryToPostData(dynamicQuery, programInfo) {
    if (dynamicQuery.rule) {
        var equalsArray = [];
        var notEqualsArray = [];

        JSON.parse(dynamicQuery.rule).operator_group_members.map((queryParam) => {
            switch (queryParam["map"].operator_value) {
                case '=':
                case 'STARTSWITH':
                case 'LIKE':
                    const equalsQueryString = convertRuleToQueryString(queryParam);
                    if (equalsQueryString) {
                        equalsArray.push(equalsQueryString);
                    }
                    break;
                case '!=':
                    const notEqualsQueryString = convertRuleToQueryString(queryParam);
                    if (notEqualsQueryString) {
                        notEqualsArray.push(notEqualsQueryString);
                    }
                    break;

                default:
                    break;
            }
        });

        const postData = {
            "query": {
                "bool": {
                    "filter": [
                        {
                            "terms": {
                                "contenttype": [
                                    "unsw_psubject"
                                ]
                            }
                        },
                        {
                            "term": {
                                "live": true
                            }
                        }
                    ],
                    // ...equalsArray.length && { "must": equalsArray },
                    "must": equalsArray,
                    ...notEqualsArray.length && { "must_not": notEqualsArray }
                }
            },
            "sort": [
                {
                    "unsw_psubject.code_dotraw": "asc"
                }
            ],
            "from": 0,
            "size": 1000
        }

        return postData;
    }
    else if (dynamicQuery.dynamic_query) {
        const queries = dynamicQuery.dynamic_query.split('&');

        // Iterate over queries and convert
        var parsedQuery = [{
            "query_string": {
                "fields": [
                    "unsw_psubject.studyLevelValue"
                ],
                "query": programInfo.studyLevel
            }
        },
        {
            "query_string": {
                "fields": [
                    "unsw_psubject.implementationYear"
                ],
                "query": programInfo.year
            }
        }];
        queries.map((query) => {
            const splitQuery = query.split('=');
            switch (splitQuery[0]) {
                case 'faculty':
                    parsedQuery.push({
                        "query_string": {
                            "fields": [
                                splitQuery[1] === programInfo.faculty ? "unsw_psubject.parentAcademicOrg" : "unsw_psubject.academicOrg"
                            ],
                            "query": splitQuery[1]
                        }
                    });
                    break;

                case 'rx':
                    if (splitQuery[1].length < 10) {
                        parsedQuery.push({
                            "regexp": {
                                "unsw_psubject.code": splitQuery[1]
                            }
                        });
                    }
                    break;

                default:
                    break;
            }
        });

        const postData = {
            "query": {
                "bool": {
                    "filter": [
                        {
                            "terms": {
                                "contenttype": [
                                    "unsw_psubject"
                                ]
                            }
                        },
                        {
                            "term": {
                                "live": true
                            }
                        }
                    ],
                    "must": parsedQuery,
                }
            },
            "sort": [
                {
                    "unsw_psubject.code_dotraw": "asc"
                }
            ],
            "from": 0,
            "size": 1000
        }

        return postData;
    }
    else {
        return null;
    }
}

function getCoursesFromDynamicQuery(db, dynamicQuery, programInfo) {
    return new Promise(async (resolve, reject) => {
        try {
            const postData = convertDynamicQueryToPostData(dynamicQuery, programInfo);
            if (postData) {
                var config = {
                    method: 'post',
                    url: 'https://www.handbook.unsw.edu.au/api/es/search',
                    headers: {
                        'authority': 'www.handbook.unsw.edu.au',
                        'sec-ch-ua': '"Chromium";v="86", ""Not\\A;Brand";v="99", "Google Chrome";v="86"',
                        'accept': 'application/json, text/plain, */*',
                        'sec-ch-ua-mobile': '?0',
                        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.80 Safari/537.36',
                        'content-type': 'application/json;charset=UTF-8',
                        'origin': 'https://www.handbook.unsw.edu.au',
                        'sec-fetch-site': 'same-origin',
                        'sec-fetch-mode': 'cors',
                        'sec-fetch-dest': 'empty',
                        'referer': 'https://www.handbook.unsw.edu.au/search?appliedFilters=eyJzZWFyY2giOnsiY3QiOiJzdWJqZWN0IiwiZXMiOnsicXVlcnkiOnsiYm9vbCI6eyJmaWx0ZXIiOlt7InRlcm1zIjp7ImNvbnRlbnR0eXBlIjpbInVuc3dfcHN1YmplY3QiXX19LHsidGVybSI6eyJsaXZlIjp0cnVlfX1dLCJtdXN0IjpbeyJxdWVyeV9zdHJpbmciOnsiZmllbGRzIjpbInVuc3dfcHN1YmplY3Quc3R1ZHlMZXZlbFZhbHVlIl0sInF1ZXJ5IjoidWdyZCJ9fSx7InF1ZXJ5X3N0cmluZyI6eyJmaWVsZHMiOlsidW5zd19wc3ViamVjdC5pbXBsZW1lbnRhdGlvblllYXIiXSwicXVlcnkiOiIyMDIxIn19LHsicmVnZXhwIjp7InVuc3dfcHN1YmplY3QuY29kZSI6Ii4uLi4xLi4uIn19XX19LCJzb3J0IjpbeyJ1bnN3X3BzdWJqZWN0LmNvZGVfZG90cmF3IjoiYXNjIn1dLCJmcm9tIjowLCJzaXplIjoxNX0sInByZWZpeCI6InVuc3dfcCJ9LCJkZXNjcmlwdGlvbiI6ImFueSBsZXZlbCAxIGNvdXJzZSIsInZlcnNpb24iOiIiLCJjb2RlIjoiVjFfMzUwMiIsInRpdGxlIjoiQ29tbWVyY2UiLCJydWxlSWQiOiJhYWMxZjU4NWRiNzU0MDUwMDM4Y2M0MDQ4YTk2MTljNSIsInNvdXJjZVVSTCI6Ii91bmRlcmdyYWR1YXRlL3Byb2dyYW1zLzIwMjAvMzUwMiIsInNvdXJjZVVSTFRleHRLZXkiOiJjc193aWxkY2FyZF9zb3VyY2VfYmFja19saW5rdGV4dCIsInNvdXJjZVR5cGUiOiJQcm9ncmFtIn0=',
                        'accept-language': 'en-US,en;q=0.9',
                    },
                    data: postData
                };

                axios(config)
                    .then(function (response) {
                        // Upload every course to a DB
                        // pushCoursesToDB(db, response.data.contentlets, programInfo.year);

                        // Return an array of JUST .code 
                        const courseCodes = response.data.contentlets.map((course) => { return { code: course.code, credit_points: course.credit_points || course.creditPoints || course.academic_item_credit_points } });
                        resolve(courseCodes);
                    })
                    .catch(function (error) {
                        console.log("AXIOS ERROR GETTING COURSES", error.response.status); // HERE
                        reject(error);
                    });
            }
            else {
                resolve();
            }
        } catch (ex) {
            console.log("EXCEPTION GETTING COURSES FROM DYNAMIC QUERY", ex);
            reject(ex);
        }
    });
}
// End Dynamic Queries

function getCoursesFromRule(db, rule, programInfo) {
    return new Promise(async (resolve, reject) => {
        try {
            var courses = [];
            if (rule.relationship.length) {
                var coursesFromRelationship = [];
                const coursesPromises = rule.relationship.map((course) => {
                    return new Promise(async (resolve, reject) => {
                        try {
                            if (course.academic_item_code) {
                                coursesFromRelationship.push({ code: course.academic_item_code, credit_points: course.credit_points || course.creditPoints || course.academic_item_credit_points });
                            }
                            else if (course.rule || course.dynamic_query) {
                                const coursesFromDynamicQuery = await getCoursesFromDynamicQuery(db, course, programInfo);
                                coursesFromRelationship.push(coursesFromDynamicQuery);
                            }

                            resolve();
                        } catch (ex) {
                            console.log("EXCEPTION GETTING COURSE PROMISES", ex)
                            reject(ex);
                        }
                    });
                });
                await Promise.all(coursesPromises);

                courses.push(_.flatten(coursesFromRelationship));
            }

            if (rule.dynamic_relationship.length) {
                // EXPERIMENTAL
                var coursesFromDynamicRelationship = [];
                const coursesPromises = rule.dynamic_relationship.map((course) => {
                    return new Promise(async (resolve, reject) => {
                        try {
                            const dynamicCourses = await getCoursesFromDynamicQuery(db, course, programInfo);
                            // coursesFromDynamicRelationship.push(dynamicCourses);
                            coursesFromDynamicRelationship = coursesFromDynamicRelationship.concat(dynamicCourses);
                            resolve();
                        } catch (ex) {
                            console.log("EXCEPTION GETTING DYNAMIC COURSE PROMISES");
                            reject(ex);
                        }
                    });
                });
                await Promise.all(coursesPromises);

                courses.push(coursesFromDynamicRelationship);
            }

            resolve({
                ...rule.credit_points && { credit_points: rule.credit_points },
                ...rule.credit_points_max && { credit_points_max: rule.credit_points_max },
                description: rule.description ? rule.description : rule.title,
                ...courses.length && { courses: _.uniqBy(_.flatten(courses), 'code') }
            });

        } catch (ex) {
            console.log("EXCEPTION GETTING COURSES FROM RULE", ex);
            reject(ex);
        }
    });
}

module.exports = {
    getCourses: function (db, rule, programInfo) {
        return new Promise(async (resolve, reject) => {
            try {
                const courses = await getCoursesFromRule(db, rule, programInfo);
                resolve(courses);
            } catch (ex) {
                console.log("EXCEPTION UPDATING DB", ex);
                reject(ex);
            }
        });
    }
}