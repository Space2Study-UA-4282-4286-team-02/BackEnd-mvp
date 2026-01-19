const mongoose = require('mongoose')
const getRegex = require('../getRegex')
const offerService = require('~/services/offer')

const offerSearchToolbarAggregate = (query, params) => {
  const {
    search,
    categoryId,
    subjectId,
    skip = 0,
    limit = 5,
    sort = 'createdAt'
  } = query || {}

  const { id: authorId } = params || {}
  const match = {}

  if (search && String(search).trim() !== '') {
    const q = String(search).trim()
    const parts = q.split(/\s+/)
    const first = parts[0]
    const second = parts[1] || ''

    const firstNameRegex = getRegex(first)
    const lastNameRegex = second ? getRegex(second) : null
    const wholeRegex = getRegex(q)

    const singleNameFieldMatches = [
      { 'author.firstName': wholeRegex },
      { 'author.lastName': wholeRegex }
    ]

    const additionalFields = authorId
      ? [{ 'subject.name': wholeRegex }]
      : [
          { 'author.firstName': firstNameRegex, 'author.lastName': lastNameRegex || getRegex('') },
          { 'author.firstName': lastNameRegex || getRegex(''), 'author.lastName': firstNameRegex },
          ...singleNameFieldMatches
        ]

    match.$or = [{ title: wholeRegex }, ...additionalFields]
  }

  if (categoryId) {
    try {
      match.category = mongoose.Types.ObjectId(categoryId)
    } catch (e) {}
  }

  if (subjectId) {
    try {
      match.subject = mongoose.Types.ObjectId(subjectId)
    } catch (e) {}
  }

  let sortOption = { createdAt: -1 }
  if (sort && typeof sort === 'string') {
    sortOption = { [sort]: -1 }
  }

  return [
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        pipeline: [
          {
            $project: { firstName: 1, lastName: 1, photo: 1 }
          }
        ],
        as: 'author'
      }
    },
    { $unwind: '$author' },

    { $match: match },

    {
      $lookup: {
        from: 'subjects',
        localField: 'subject',
        foreignField: '_id',
        as: 'subject'
      }
    },
    { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category'
      }
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },

    {
      $addFields: {
        subjectName: { $ifNull: ['$subject.name', null] },
        categoryName: { $ifNull: ['$category.name', null] }
      }
    },

    { $sort: sortOption },

    {
      $facet: {
        count: [{ $count: 'count' }],
        items: [{ $skip: Number(skip) }, { $limit: Number(limit) }]
      }
    },
    {
      $project: {
        count: {
          $cond: {
            if: { $eq: ['$count', []] },
            then: 0,
            else: { $arrayElemAt: ['$count.count', 0] }
          }
        },
        items: 1
      }
    }
  ]
}

const offerSearchToolbar = async (query, params) => {
  const decodedSearch = decodeURIComponent(query.search || '')
  const searchTerms = decodedSearch.trim().split(/\s+/).filter(Boolean)

  if (searchTerms.length > 1) {
    const allOffers = []

    for (const term of searchTerms) {
      const pipeline = offerSearchToolbarAggregate({ ...query, search: term }, params)
      const response = await offerService.getOffers(pipeline)
      allOffers.push(...(response?.items ?? []))
    }

    const uniqueMap = new Map()
    for (const offer of allOffers) {
      const key = offer && offer._id ? String(offer._id) : JSON.stringify(offer)
      if (!uniqueMap.has(key)) uniqueMap.set(key, offer)
    }
    const uniqueOffers = Array.from(uniqueMap.values())
    return uniqueOffers
  }

  const pipeline = offerSearchToolbarAggregate(query, params)
  const response = await offerService.getOffers(pipeline)

  if (response && typeof response === 'object' && (Array.isArray(response.items) || typeof response.count !== 'undefined')) {
    return response
  }

  return Array.isArray(response) ? response : (response?.items ?? [])
}

module.exports = offerSearchToolbar
