const mongoose = require('mongoose')
const Offer = require('~/models/offer')
const offerService = require('~/services/offer')

jest.mock('~/models/offer')

describe('Offer service — involvement checks', () => {
  const offerId = '000000000000000000000001'
  const authorId = mongoose.Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa')
  const otherUserId = mongoose.Types.ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb')

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('non-author cannot update offer (should throw 403)', async () => {
    const fakeOffer = {
      _id: mongoose.Types.ObjectId(offerId),
      author: authorId,
      save: jest.fn().mockResolvedValue(),
      validate: jest.fn().mockResolvedValue()
    }

    Offer.findById.mockResolvedValue(fakeOffer)

    await expect(offerService.updateOffer(offerId, otherUserId, { title: 'new' }))
      .rejects.toMatchObject({ status: 403 })
  })

  test('author can update offer (should not throw and should save)', async () => {
    const fakeOffer = {
      _id: mongoose.Types.ObjectId(offerId),
      author: authorId,
      save: jest.fn().mockResolvedValue(),
      validate: jest.fn().mockResolvedValue()
    }

    Offer.findById.mockResolvedValue(fakeOffer)

    await expect(offerService.updateOffer(offerId, authorId, { title: 'new' }))
      .resolves.toBeUndefined()

    expect(fakeOffer.save).toHaveBeenCalled()
  })

  test('non-author cannot delete offer (should throw 403)', async () => {
    const fakeOffer = {
      _id: mongoose.Types.ObjectId(offerId),
      author: authorId
    }

    Offer.findById.mockResolvedValue(fakeOffer)

    await expect(offerService.deleteOffer(offerId, otherUserId))
      .rejects.toMatchObject({ status: 403 })
  })

  test('author can delete offer (should call findByIdAndRemove)', async () => {
    const fakeOffer = {
      _id: mongoose.Types.ObjectId(offerId),
      author: authorId
    }

    Offer.findById.mockResolvedValue(fakeOffer)
    Offer.findByIdAndRemove = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(true) })

    await expect(offerService.deleteOffer(offerId, authorId))
      .resolves.toBeUndefined()

    expect(Offer.findByIdAndRemove).toHaveBeenCalledWith(offerId)
  })
})
