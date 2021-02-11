import { expect } from 'chai';
import childProcess from 'child_process';
import commandExists from 'command-exists';
import { promises as fs } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { withTempPackageEach } from '../../test/helpers';
import BuildVariant from '../build-variant';
import { createTarball } from './create-tarball';
import { tarballRedhat } from './redhat';

const execFile = promisify(childProcess.execFile);

describe('tarball redhat', () => {
  const tmpPkg = withTempPackageEach();

  it('packages the executable(s)', async function() {
    try {
      await commandExists('rpmbuild');
    } catch {
      this.skip();
      return;
    }

    const tarball = await createTarball(
      tmpPkg.tarballDir,
      BuildVariant.Redhat,
      tmpPkg.pkgConfig
    );

    await fs.access(tarball.path);
    const { stdout } = await execFile('rpm', ['-qlpi', tarball.path]);
    expect(stdout).to.match(/Name\s+:\s+foobar/);
    expect(stdout).to.match(/Version\s+:\s+1.0.0/);
    expect(stdout).to.match(/License\s+:\s+Banana and Apple/);
    expect(stdout).to.match(/URL\s+:\s+https:\/\/example.org/);
    expect(stdout).to.match(/Summary\s+:\s+Dummy package/);
    expect(stdout).to.match(/^\/usr\/bin\/foo$/m);
    expect(stdout).to.match(/^\/usr\/libexec\/bar$/m);
    expect(stdout).to.match(/^\/usr\/share\/doc\/foobar-1.0.0\/README$/m);
    expect(stdout).to.match(/^\/usr\/share\/licenses\/foobar-1.0.0\/LICENSE_bar$/m);
    expect(stdout).to.match(/^\/usr\/share\/licenses\/foobar-1.0.0\/LICENSE_foo$/m);
  });

  it('determines and copies created RPM', async() => {
    const content = await fs.readFile(__filename);
    const execFileStub = async(cmd: string, args: string[]) => {
      const rpmDir = path.join(path.dirname(path.dirname(args[1])), 'RPMS', 'x86_64');
      await fs.mkdir(rpmDir, { recursive: true });
      await fs.writeFile(path.join(rpmDir, 'somefile.rpm'), content);
    };

    const outFile = path.join(tmpPkg.tarballDir, 'out.rpm');
    await tarballRedhat(
      tmpPkg.pkgConfig,
      tmpPkg.pkgConfig.rpmTemplateDir,
      outFile,
      execFileStub as any
    );
    expect((await fs.readFile(outFile)).toString('utf8')).to.equal(content.toString('utf8'));
  });

  it('fails if there are multiple RPMs generated', async() => {
    const content = await fs.readFile(__filename);
    const execFileStub = async(cmd: string, args: string[]) => {
      const rpmDir = path.join(path.dirname(path.dirname(args[1])), 'RPMS', 'x86_64');
      await fs.mkdir(rpmDir, { recursive: true });
      await fs.writeFile(path.join(rpmDir, 'somefile.rpm'), content);
      await fs.writeFile(path.join(rpmDir, 'somefile2.rpm'), content);
    };

    const outFile = path.join(tmpPkg.tarballDir, 'out.rpm');
    try {
      await tarballRedhat(
        tmpPkg.pkgConfig,
        tmpPkg.pkgConfig.rpmTemplateDir,
        outFile,
          execFileStub as any
      );
    } catch (e) {
      expect(e.message).to.contain('Don’t know which RPM from');
      return;
    }
    expect.fail('Expected error');
  });
});
