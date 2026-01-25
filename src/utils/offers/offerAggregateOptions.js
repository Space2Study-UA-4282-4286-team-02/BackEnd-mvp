const mongoose = require('mongoose')
const getRegex = require('../getRegex')

const offerAggregateOptions = (query = {}, params = {}) => {
  const {
    authorRole,
    price,
    proficiencyLevel,
    rating,
    language,
    search,
    languages,
    nativeLanguage,
    excludedOfferId,
    categoryId,
    subjectId,
    sort = 'createdAt',
    status,
    skip = 0,
    limit = 5,
    searchContext
  } = query || {}
  const { id: authorId } = params || {}

  const match = {}

  let context = searchContext
  if (!context) {
    if (authorId || categoryId || subjectId) context = 'subject'
    else context = 'tutor'
  }

  if (search && String(search).trim() !== '') {
    const q = String(search).trim()
    const parts = q.split(/\s+/)
    const first = parts[0]
    const second = parts[1] || ''

    const wholeRegex = getRegex(q)
    const firstNameRegex = getRegex(first)
    const lastNameRegex = second ? getRegex(second) : getRegex('')

    if (context === 'subject') {
      match.$or = [{ title: wholeRegex }, { 'subject.name': wholeRegex }]
    } else {
      const singleNameFieldMatches = [
        { 'author.firstName': wholeRegex },
        { 'author.lastName': wholeRegex }
      ]

      const additionalFields = authorId
        ? [{ 'subject.name': wholeRegex }]
        : [
            { 'author.firstName': firstNameRegex, 'author.lastName': lastNameRegex },
            { 'author.firstName': lastNameRegex, 'author.lastName': firstNameRegex },
            ...singleNameFieldMatches
          ]

      match.$or = [{ title: wholeRegex }, ...additionalFields]
    }
  }

  if (categoryId) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new Error(`Invalid categoryId: ${categoryId}`)
    }
    match['category._id'] = mongoose.Types.ObjectId(categoryId)
  }

  if (subjectId) {
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      throw new Error(`Invalid subjectId: ${subjectId}`)
    }
    match['subject._id'] = mongoose.Types.ObjectId(subjectId)
  }

  if (authorId) {
    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      throw new Error(`Invalid authorId: ${authorId}`)
    }
    match['author._id'] = mongoose.Types.ObjectId(authorId)
  }

  if (authorRole) {
    match.authorRole = authorRole
  }

  if (proficiencyLevel) {
    match.proficiencyLevel = { $in: proficiencyLevel }
  }

  if (price) {
    const [minPrice, maxPrice] = price
    match.price = { $gte: parseInt(minPrice, 10), $lte: parseInt(maxPrice, 10) }
  }

  if (rating) {
    match[`author.averageRating.${authorRole}`] = { $gte: parseInt(rating, 10) }
  }

  if (language) {
    match.languages = getRegex(language)
  }

  if (languages) {
    match.languages = { $in: languages }
  }

  if (status) {
    match.status = status
  }

  if (nativeLanguage) {
    match['author.nativeLanguage'] = getRegex(nativeLanguage)
  }

  if (excludedOfferId) {
    try {
      match._id = { $ne: mongoose.Types.ObjectId(excludedOfferId) }
    } catch (e) {
      console.warn(`Failed to parse excludedOfferId: ${excludedOfferId}`, e);
    }
  }

  let sortOption = {}
  if (sort) {
    try {
      const parsedSort = JSON.parse(sort)
      const { order, orderBy } = parsedSort
      const sortOrder = order === 'asc' ? 1 : -1
      sortOption = { [orderBy]: sortOrder }
    } catch {
      if (typeof sort === 'string') {
        if (sort === 'priceAsc') {
          sortOption['price'] = 1
        } else if (sort === 'priceDesc') {
          sortOption['price'] = -1
        } else if (sort === 'rating' && authorRole) {
          sortOption[`author.averageRating.${authorRole}`] = -1
        } else {
          sortOption = { [sort]: -1 }
        }
      }
    }
  }

  return [
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              firstName: 1,
              lastName: 1,
              averageRating: 1,
              totalReviews: 1,
              nativeLanguage: 1,
              photo: 1,
              professionalSummary: 1,
              FAQ: 1
            }
          }
        ],
        as: 'author'
      }
    },
    { $unwind: '$author' },
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
    { $match: match },
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

module.exports = offerAggregateOptions
