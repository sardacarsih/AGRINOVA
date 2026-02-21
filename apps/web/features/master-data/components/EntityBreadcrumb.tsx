'use client';

import { Breadcrumbs, Link, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import BusinessIcon from '@mui/icons-material/Business';
import NatureIcon from '@mui/icons-material/Nature';
import FolderIcon from '@mui/icons-material/Folder';
import GridOnIcon from '@mui/icons-material/GridOn';

interface EntityBreadcrumbProps {
    company?: { id: string; name: string };
    estate?: { id: string; name: string };
    division?: { id: string; name: string };
    block?: { id: string; name: string };
    currentPage?: string;
}

export function EntityBreadcrumb({ company, estate, division, block, currentPage }: EntityBreadcrumbProps) {
    return (
        <Breadcrumbs sx={{ mb: 2 }}>
            <Link
                href="/"
                underline="hover"
                color="inherit"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
                <HomeIcon fontSize="small" />
                Dashboard
            </Link>

            {company && (
                <Link
                    href={`/companies/${company.id}`}
                    underline="hover"
                    color="inherit"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                    <BusinessIcon fontSize="small" />
                    {company.name}
                </Link>
            )}

            {estate && (
                <Link
                    href={`/estates/${estate.id}`}
                    underline="hover"
                    color="inherit"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                    <NatureIcon fontSize="small" />
                    {estate.name}
                </Link>
            )}

            {division && (
                <Link
                    href={`/divisions/${division.id}`}
                    underline="hover"
                    color="inherit"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                    <FolderIcon fontSize="small" />
                    {division.name}
                </Link>
            )}

            {block && (
                <Link
                    href={`/blocks/${block.id}`}
                    underline="hover"
                    color="inherit"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                    <GridOnIcon fontSize="small" />
                    {block.name}
                </Link>
            )}

            {currentPage && (
                <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                    {currentPage}
                </Typography>
            )}
        </Breadcrumbs>
    );
}
