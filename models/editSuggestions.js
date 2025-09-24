const mongoose = require('mongoose');

const editSuggestionSchema = new mongoose.Schema({
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  editorName: { type: String, required: true },
  editType: { type: String, required: true },
  suggestion: { type: String, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EditSuggestion', editSuggestionSchema);
