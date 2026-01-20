const Offer = require('~/models/offer')
const filterAllowedFields = require('~/utils/filterAllowedFields')
const { allowedOfferFieldsForUpdate } = require('~/validation/services/offer')
const offerAggregateOptions = require('~/utils/offers/offerAggregateOptions')

const offerService = {
  getOffers: async (query = {}, params = {}) => {
    const decodedSearch = decodeURIComponent(query.search || '')
    const searchTerms = decodedSearch.trim().split(/\s+/).filter(Boolean)

    let searchContext = query.searchContext
    if (!searchContext) {
      if (params && params.id) {
        searchContext = 'subject'
      } else if (query && (query.categoryId || query.subjectId)) {
        searchContext = 'subject'
      } else {
        searchContext = 'tutor'
      }
    }

    if (searchTerms.length > 1) {
      const allOffers = []

      for (const term of searchTerms) {
        const pipeline = offerAggregateOptions({ ...query, search: term, searchContext }, params)
        const [response] = await Offer.aggregate(pipeline).exec()
        if (response && typeof response === 'object' && Array.isArray(response.items)) {
          allOffers.push(...response.items)
        } else if (Array.isArray(response)) {
          allOffers.push(...response)
        }
      }

      const uniqueMap = new Map()
      for (const offer of allOffers) {
        const key = offer && offer._id ? String(offer._id) : JSON.stringify(offer)
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, offer)
        }
      }
      return Array.from(uniqueMap.values())
    }

    const pipeline = offerAggregateOptions({ ...query, search: decodedSearch, searchContext }, params)
    const [response] = await Offer.aggregate(pipeline).exec()

    if (
      response &&
      typeof response === 'object' &&
      (Array.isArray(response.items) || typeof response.count !== 'undefined')
    ) {
      return response
    }
    return Array.isArray(response) ? response : (response?.items ?? [])
  },

  getOfferById: async (id) => {
    const offer = await Offer.findById(id)
      .populate([
        {
          path: 'author',
          select: [
            'firstName',
            'lastName',
            'totalReviews',
            'averageRating',
            'photo',
            'professionalSummary',
            'FAQ'
          ]
        },
        { path: 'subject', select: 'name' },
        { path: 'category', select: 'appearance' }
      ])
      .lean()
      .exec()

    if (offer.author.FAQ && offer.authorRole in offer.author.FAQ) {
      offer.author.FAQ = offer.author.FAQ[offer.authorRole]
    } else {
      delete offer.author.FAQ
    }

    return offer
  },

  createOffer: async (author, authorRole, data) => {
    const {
      price,
      proficiencyLevel,
      title,
      description,
      languages,
      subject,
      category,
      status,
      FAQ
    } = data

    return await Offer.create({
      author,
      authorRole,
      price,
      proficiencyLevel,
      title,
      description,
      languages,
      subject,
      category,
      status,
      FAQ
    })
  },

  updateOffer: async (id, currentUserId, updateData) => {
    const filteredUpdateData = filterAllowedFields(updateData, allowedOfferFieldsForUpdate)
    const offer = await Offer.findById(id)
    if (!offer) {
      const err = new Error('Offer not found')
      err.status = 404
      throw err
    }

    const offerAuthorId = offer.author && offer.author.toString
      ? offer.author.toString()
      : String(offer.author)
    if (offerAuthorId !== String(currentUserId)) {
      const err = new Error('Forbidden')
      err.status = 403
      throw err
    }

    for (let field in filteredUpdateData) {
      offer[field] = filteredUpdateData[field]
    }

    await offer.validate()
    await offer.save()
  },

  deleteOffer: async (id, currentUserId) => {
    const offer = await Offer.findById(id)
    if (!offer) {
      const err = new Error('Offer not found')
      err.status = 404
      throw err
    }

    const offerAuthorId = offer.author && offer.author.toString
      ? offer.author.toString()
      : String(offer.author)
    if (offerAuthorId !== String(currentUserId)) {
      const err = new Error('Forbidden')
      err.status = 403
      throw err
    }

    await Offer.findByIdAndRemove(id).exec()
  }
}

module.exports = offerService
