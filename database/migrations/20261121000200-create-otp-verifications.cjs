
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('otp_verifications', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
      },
      phone_number: {
        type: Sequelize.STRING(15),
        allowNull: false,
      },
      otp_code: {
        type: Sequelize.STRING(6),
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      wrong_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      consumed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      invalidated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex('otp_verifications', ['phone_number', 'created_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('otp_verifications');
  },
};
