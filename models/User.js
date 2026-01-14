const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema for Kendo Mooncake Central Kitchen System
 * Handles user authentication and authorization
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password in queries by default
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role is required'],
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Validate storeId requirement based on role
userSchema.pre('validate', async function () {
  if (this.isModified('roleId') || this.isModified('storeId')) {
    const Role = mongoose.model('Role');
    const role = await Role.findById(this.roleId);

    if (role && role.roleName === 'StoreStaff') {
      if (!this.storeId) {
        throw new Error('StoreStaff must be assigned to a store');
      }
    } else if (role && ['Manager', 'KitchenStaff', 'Admin', 'Coordinator'].includes(role.roleName)) {
      // These roles should not have a storeId
      if (this.storeId) {
        this.storeId = null;
      }
    }
  }
});

// Hash password before saving
userSchema.pre('save', async function () {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('passwordHash')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Index for faster queries (username and email already have unique index)
userSchema.index({ roleId: 1 });
userSchema.index({ storeId: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
