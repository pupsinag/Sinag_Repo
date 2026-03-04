/* eslint-env node */
const path = require('path');
const fs = require('fs');

const { Company, Intern, User } = require('../models');
const generateDailyAttendancePDF = require('../utils/generateDailyAttendancePDF');
const generateGeneralRecordPDF = require('../utils/generateGeneralRecordPDF');

/* =========================
   GET COMPANY PROFILE
========================= */
exports.getMyCompany = async (req, res) => {
  try {
    const company = await Company.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json(company);
  } catch (err) {
    console.error('❌ getMyCompany error:', err);
    res.status(500).json({ message: 'Failed to load company profile' });
  }
};

/* =========================
   UPDATE COMPANY PROFILE
========================= */
exports.updateMyCompany = async (req, res) => {
  try {
    const company = await Company.findByPk(req.user.id);

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const { supervisorName, name, natureOfBusiness } = req.body;

    await company.update({
      supervisorName,
      name,
      natureOfBusiness,
    });

    res.json({
      message: 'Profile updated successfully',
      company,
    });
  } catch (err) {
    console.error('❌ updateMyCompany error:', err);
    res.status(500).json({ message: 'Failed to update company profile' });
  }
};

/* =========================
   GET COMPANY INTERNS
========================= */
exports.getCompanyInterns = async (req, res) => {
  try {
    const { supervisor_id } = req.query;

    // Build where clause
    const where = { company_id: req.user.id };

    // If supervisor_id provided, filter by it
    if (supervisor_id) {
      where.supervisor_id = supervisor_id;
    }

    const interns = await Intern.findAll({
      where,
      attributes: ['id', 'user_id', 'status', 'program', 'supervisor_id'],
    });

    const result = [];

    for (const intern of interns) {
      const user = await User.findByPk(intern.user_id, {
        attributes: ['studentId', 'firstName', 'lastName', 'mi', 'email'],
      });

      if (user) {
        result.push({
          id: intern.id,
          studentId: user.studentId,
          firstName: user.firstName,
          lastName: user.lastName,
          mi: user.mi,
          email: user.email,
          status: intern.status,
          program: intern.program,
          supervisor_id: intern.supervisor_id,
        });
      }
    }

    console.log('✅ Fetched company interns:', result.length, { company_id: req.user.id, supervisor_id });
    res.json(result);
  } catch (err) {
    console.error('❌ getCompanyInterns error:', err);
    res.status(500).json({ message: 'Failed to load interns' });
  }
};

/* =========================
   UPLOAD / UPDATE MOA
========================= */
exports.uploadMoa = async (req, res) => {
  try {
    const company = await Company.findOne({
      where: { email: req.user.email },
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Save MOA file to database only (no filesystem)
    await company.update({
      moaFile_content: req.file.buffer, // Save file content as binary
      moaFile_mime_type: req.file.mimetype, // Save file MIME type
    });

    console.log('✅ MOA file saved to database:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    res.json({
      message: 'MOA uploaded and stored in database successfully',
      moaFile: company.moaFile,
      moaFile_mime_type: company.moaFile_mime_type,
    });
  } catch (err) {
    console.error('❌ uploadMoa error:', err);
    res.status(500).json({ message: 'Failed to upload MOA', error: err.message });
  }
};

/* =========================
   GET / VIEW MOA (INLINE PDF)
   COMPANY + INTERN
========================= */
exports.getMoa = async (req, res) => {
  try {
    let company = null;

    /* =========================
       COMPANY/SUPERVISOR views own MOA
    ========================= */
    if (req.user.role === 'company' || req.user.role === 'supervisor') {
      company = await Company.findOne({
        where: { email: req.user.email },
      });
    }

    /* =========================
       INTERN views assigned MOA
    ========================= */
    if (req.user.role === 'intern') {
      const intern = await Intern.findOne({
        where: { user_id: req.user.id },
      });

      if (!intern || !intern.company_id) {
        return res.status(404).json({ message: 'No company assigned' });
      }

      company = await Company.findByPk(intern.company_id);
    }

    if (!company || !company.moaFile_content) {
      return res.status(404).json({ message: 'MOA not found in database' });
    }

    // Serve MOA from database
    console.log('✅ Serving MOA from database');
    
    const mimeType = company.moaFile_mime_type || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'inline; filename="moa.pdf"');
    res.setHeader('Content-Length', company.moaFile_content.length);
    
    return res.send(company.moaFile_content);
  } catch (err) {
    console.error('❌ getMoa error:', err);
    res.status(500).json({ message: 'Failed to load MOA', error: err.message });
  }
};

/* =========================
   GET MOA BY COMPANY ID (COORDINATOR/ADVISER)
========================= */
exports.getMoaByCompanyId = async (req, res) => {
  try {
    const { companyId } = req.params;

    // Only coordinators and advisers can view other companies' MOAs
    if (!['coordinator', 'adviser', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to view this MOA' });
    }

    const company = await Company.findByPk(companyId);

    if (!company || !company.moaFile_content) {
      return res.status(404).json({ message: 'MOA not found for this company' });
    }

    console.log('✅ Serving MOA for company:', companyId);
    
    const mimeType = company.moaFile_mime_type || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'inline; filename="moa.pdf"');
    res.setHeader('Content-Length', company.moaFile_content.length);
    
    return res.send(company.moaFile_content);
  } catch (err) {
    console.error('❌ getMoaByCompanyId error:', err);
    res.status(500).json({ message: 'Failed to load MOA', error: err.message });
  }
};

/* =========================
   GENERATE DAILY ATTENDANCE REPORT
========================= */
exports.generateDailyAttendance = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    // Helper function to format time to 12-hour format with AM/PM
    const formatTime = (time24) => {
      if (!time24) return '-';

      const [hours, minutes] = time24.split(':');
      let hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';

      hour = hour % 12;
      hour = hour ? hour : 12; // 0 should be 12

      return `${hour}:${minutes} ${ampm}`;
    };

    // Get company info
    const company = await Company.findByPk(req.user.id);

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Get models dynamically
    const models = require('../models');
    const { InternDailyLog } = models;

    // Get all interns assigned to this company
    const interns = await Intern.findAll({
      where: { company_id: company.id },
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['firstName', 'lastName'],
        },
      ],
    });

    // Get daily logs for the specified date - ONLY include interns with both time_in and time_out
    const studentsData = [];

    for (const intern of interns) {
      const log = await InternDailyLog.findOne({
        where: {
          intern_id: intern.id,
          log_date: date,
        },
      });

      // Only add to list if log exists AND both time_in and time_out are present
      if (log && log.time_in && log.time_out) {
        studentsData.push({
          name: `${intern.User.lastName}, ${intern.User.firstName}`,
          timeIn: formatTime(log.time_in),
          timeOut: formatTime(log.time_out),
        });
      }
    }

    // Sort students alphabetically by name (lastName, firstName)
    studentsData.sort((a, b) => a.name.localeCompare(b.name));

    // Generate PDF directly to response
    const filename = `DailyAttendance_${company.name.replace(/\s+/g, '_')}_${date}.pdf`;
    const pdfData = {
      date: date,
      companyName: company.name,
      students: studentsData,
    };

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Generate PDF and pipe directly to response
    const generatePDF = require('../utils/generateDailyAttendancePDF');
    generatePDF(pdfData, res);
  } catch (err) {
    console.error('❌ generateDailyAttendance error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to generate daily attendance report' });
    }
  }
};

/* =========================
   GENERATE GENERAL RECORD
========================= */
exports.generateGeneralRecord = async (req, res) => {
  try {
    // Get company info
    const company = await Company.findByPk(req.user.id);

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Get all interns assigned to this company with their user details
    const interns = await Intern.findAll({
      where: { company_id: company.id },
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['studentId', 'firstName', 'lastName', 'email', 'guardian'],
        },
      ],
    });

    // Format student data
    const studentsData = interns.map((intern) => ({
      studentId: intern.User.studentId || '-',
      fullName: `${intern.User.lastName}, ${intern.User.firstName}`,
      email: intern.User.email || '-',
      guardian: intern.User.guardian || '-',
      position: intern.position || '-',
    }));

    // Sort students alphabetically by last name, then first name
    studentsData.sort((a, b) => a.fullName.localeCompare(b.fullName));

    // Generate PDF directly to response
    const filename = `GeneralRecord_${company.name.replace(/\s+/g, '_')}.pdf`;
    const pdfData = {
      companyName: company.name,
      students: studentsData,
    };

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Generate PDF and pipe directly to response
    generateGeneralRecordPDF(pdfData, res);
  } catch (err) {
    console.error('❌ generateGeneralRecord error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to generate general record' });
    }
  }
};
