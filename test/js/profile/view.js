import { element } from '../schedule/elements.js';

export function profileContent(profile) {
    const content = element('div', null, 'profile-information');
    const heading = element('h2', profile.name, 'section-title');
    heading.id = 'profile-name';
    content.append(heading);
    if (profile.image) {
        const image = element('img', null, 'profile-image');
        image.src = profile.image;
        image.alt = profile.imageAlt || profile.name;
        content.append(image);
    }
    if (profile.summary) content.append(element('p', profile.summary));
    if (profile.description) content.append(element('p', profile.description, 'profile-description'));
    if (profile.email) {
        const line = element('p', 'Электронная почта: ');
        const email = element('a', profile.email);
        email.href = `mailto:${profile.email}`;
        line.append(email);
        content.append(line);
    }
    if (profile.phone) content.append(element('p', `Телефон: ${profile.phone}`));
    const socialLinks = [
        { type: 'youtube', url: profile.youtubeUrl, title: profile.youtubeTitle || 'YouTube' },
        { type: 'facebook', url: profile.facebookUrl, title: profile.facebookTitle || 'Facebook' }
    ];
    const socials = element('div', null, 'profile-socials');
    for (const social of socialLinks) {
        if (!social.url) continue;
        try {
            const url = new URL(social.url);
            if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
            const link = element('a', null, `profile-social-link social-${social.type}`);
            const icon = element('img', null, 'profile-social-icon');
            icon.src = `/test/images/icons/${social.type}.svg`;
            icon.alt = '';
            icon.setAttribute('aria-hidden', 'true');
            link.append(icon, element('span', social.title));
            link.href = url.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            socials.append(link);
        } catch {
            // Skip a malformed optional link without hiding the profile.
        }
    }
    if (socials.childElementCount) content.append(socials);
    return content;
}
