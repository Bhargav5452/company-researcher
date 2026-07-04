export async function POST(request) {
  try {
    const {
      botToken,
      channelId,
      applicantName,
      applicantEmail,
      companyName,
      companyWebsite,
      pdfBase64,
    } = await request.json();

    if (!botToken || !channelId) {
      return Response.json(
        { error: 'Missing required fields: botToken and channelId are required.' },
        { status: 400 }
      );
    }

    const messageContent = [
      `📋 **Company Research Report**`,
      ``,
      `**Applicant Name:** ${applicantName || 'N/A'}`,
      `**Applicant Email:** ${applicantEmail || 'N/A'}`,
      `**Company:** ${companyName || 'N/A'}`,
      `**Website:** ${companyWebsite || 'N/A'}`,
    ].join('\n');

    const payloadJson = JSON.stringify({ content: messageContent });
    const formData = new FormData();
    formData.append('payload_json', payloadJson);

    if (pdfBase64) {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const filename = `${(companyName || 'company').replace(/[^a-z0-9]/gi, '_')}_report.pdf`;
      formData.append('files[0]', pdfBlob, filename);
    }

    const discordUrl = `https://discord.com/api/v10/channels/${channelId}/messages`;
    const response = await fetch(discordUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Discord API Error Response:', errorData, 'Status:', response.status);
      return Response.json(
        { error: errorData.message || `Discord API error: ${response.status} (${JSON.stringify(errorData)})` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return Response.json({ success: true, messageId: result.id });
  } catch (error) {
    console.error('Discord route catch block error:', error);
    return Response.json(
      { error: error.message || 'Failed to send message to Discord.' },
      { status: 500 }
    );
  }
}
