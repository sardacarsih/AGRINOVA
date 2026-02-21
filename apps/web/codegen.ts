import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    schema: ['../../apps/golang/internal/graphql/schema/**/*.graphqls'],
    documents: ['features/**/*.graphql'],
    generates: {
        './gql/graphql.ts': {
            plugins: ['typescript', 'typescript-operations', 'typescript-react-apollo'],
            config: {
                withHooks: true,
                scalars: {
                    Time: 'Date',
                },
            },
        }
    },
    ignoreNoDocuments: false,
    hooks: { afterAllFileWrite: [] },
    config: {
        scalars: {
            Time: 'Date',
        },
    },
};

export default config;
