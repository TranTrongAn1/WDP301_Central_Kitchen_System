const mongoose = require('mongoose');

/**
 * Role Schema for Kendo Mooncake Central Kitchen System
 * Defines user roles and permissions
 */
const roleSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: [true, 'Role name is required'],
      enum: {
        values: ['Admin', 'Manager', 'StoreStaff', 'KitchenStaff', 'Coordinator'],
        message: '{VALUE} is not a valid role',
      },
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
