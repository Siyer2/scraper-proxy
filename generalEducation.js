const axios = require('axios');

module.exports = {
    getGeneralEducation: function (db, { faculty, year, studyLevel }) {
        return new Promise(async (resolve, reject) => {
            try {
                var data = {
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
                            "must": [
                                {
                                    "query_string": {
                                        "fields": [
                                            "unsw_psubject.studyLevelValue"
                                        ],
                                        "query": studyLevel
                                    }
                                },
                                {
                                    "query_string": {
                                        "fields": [
                                            "unsw_psubject.implementationYear"
                                        ],
                                        "query": year
                                    }
                                },
                                {
                                    "query_string": {
                                        "fields": [
                                            "unsw_psubject.generalEducation"
                                        ],
                                        "query": "true"
                                    }
                                }
                            ],
                            "must_not": [
                                {
                                    "query_string": {
                                        "fields": [
                                            "unsw_psubject.parentAcademicOrg"
                                        ],
                                        "query": faculty
                                    }
                                }
                            ]
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
                        'referer': 'https://www.handbook.unsw.edu.au/search?appliedFilters=eyJzZWFyY2giOnsiY3QiOiJzdWJqZWN0IiwiZXMiOnsicXVlcnkiOnsiYm9vbCI6eyJmaWx0ZXIiOlt7InRlcm1zIjp7ImNvbnRlbnR0eXBlIjpbInVuc3dfcHN1YmplY3QiXX19LHsidGVybSI6eyJsaXZlIjp0cnVlfX1dLCJtdXN0IjpbeyJxdWVyeV9zdHJpbmciOnsiZmllbGRzIjpbInVuc3dfcHN1YmplY3Quc3R1ZHlMZXZlbFZhbHVlIl0sInF1ZXJ5IjoidWdyZCJ9fSx7InF1ZXJ5X3N0cmluZyI6eyJmaWVsZHMiOlsidW5zd19wc3ViamVjdC5pbXBsZW1lbnRhdGlvblllYXIiXSwicXVlcnkiOiIyMDIxIn19LHsicXVlcnlfc3RyaW5nIjp7ImZpZWxkcyI6WyJ1bnN3X3BzdWJqZWN0LmNzVGFncyJdLCJxdWVyeSI6Iio5NmQ5YmFlNGRiMmQ0ODEwZmM5MzY0ZTcwNTk2MTkzYSoifX1dLCJtdXN0X25vdCI6W3sicXVlcnlfc3RyaW5nIjp7ImZpZWxkcyI6WyJ1bnN3X3BzdWJqZWN0LnBhcmVudEFjYWRlbWljT3JnIl0sInF1ZXJ5IjoiNWEzYTFkNGY0ZjRkOTc0MDRhYTZlYjRmMDMxMGM3N2EifX1dfX0sInNvcnQiOlt7InVuc3dfcHN1YmplY3QuY29kZV9kb3RyYXciOiJhc2MifV0sImZyb20iOjAsInNpemUiOjE1fSwicHJlZml4IjoidW5zd19wIn0sImRlc2NyaXB0aW9uIjoiYW55IEdlbmVyYWwgRWR1Y2F0aW9uIGNvdXJzZSIsInZlcnNpb24iOiIiLCJjb2RlIjoiVjFfMzUwMiIsInRpdGxlIjoiQ29tbWVyY2UiLCJydWxlSWQiOiI1NmMxZjU4NWRiNzU0MDUwMDM4Y2M0MDQ4YTk2MTlhZiIsInNvdXJjZVVSTCI6Ii91bmRlcmdyYWR1YXRlL3Byb2dyYW1zLzIwMjAvMzUwMiIsInNvdXJjZVVSTFRleHRLZXkiOiJjc193aWxkY2FyZF9zb3VyY2VfYmFja19saW5rdGV4dCIsInNvdXJjZVR5cGUiOiJQcm9ncmFtIn0=',
                        'accept-language': 'en-US,en;q=0.9',
                    },
                    data: data
                };

                const response = await axios(config); // HERE

                // Upload every course to a DB
                // pushCoursesToDB(db, response.data.contentlets, year);

                // Return an array of JUST .code 
                const courseCodes = response.data.contentlets.map((course) => { return { code: course.code, credit_points: course.credit_points || course.creditPoints || course.academic_item_credit_points } });
                resolve(courseCodes);
            } catch (ex) {
                console.log("EXCEPTION GETTING GENERAL EDUCATION"); // Need to print the exception again
                reject(ex);
            }
        });
    }
}